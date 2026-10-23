function doPost(event) {
  const properties = PropertiesService.getScriptProperties();
  const expectedToken = properties.getProperty('APPROVAL_EMAIL_SHARED_SECRET');
  const payload = parsePayload(event);

  if (
    !expectedToken ||
    expectedToken.length < 32 ||
    !payload ||
    !constantTimeEquals(payload.token, expectedToken)
  ) {
    return jsonResponse({ ok: false, error: 'Unauthorized' });
  }

  if (
    !isUuid(payload.notificationId) ||
    !isValidEmail(payload.to) ||
    !isBoundedString(payload.subject, 180) ||
    !isBoundedString(payload.message, 3000) ||
    !isHttpsUrl(payload.appUrl)
  ) {
    return jsonResponse({ ok: false, error: 'Invalid email payload' });
  }

  const cache = CacheService.getScriptCache();
  const cacheKey = `approval-email:${payload.notificationId}`;
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    return jsonResponse({ ok: false, error: 'Try again shortly' });
  }

  try {
    if (cache.get(cacheKey)) {
      return jsonResponse({ ok: true, duplicate: true });
    }

    const subject = `Indotek Pro: ${payload.subject}`;
    const textBody = [
      payload.subject,
      '',
      payload.message,
      '',
      `Buka Indotek Pro: ${payload.appUrl}`,
    ].join('\n');
    const htmlBody = [
      `<p><strong>${escapeHtml(payload.subject)}</strong></p>`,
      `<p>${escapeHtml(payload.message).replace(/\n/g, '<br>')}</p>`,
      `<p><a href="${escapeHtml(payload.appUrl)}">Buka Indotek Pro</a></p>`,
    ].join('');

    GmailApp.sendEmail(payload.to, subject, textBody, {
      htmlBody: htmlBody,
      name: 'Indotek Pro',
    });
    cache.put(cacheKey, 'sent', 21600);
    return jsonResponse({ ok: true, duplicate: false });
  } catch (error) {
    console.error('Failed to send approval email.', error);
    return jsonResponse({ ok: false, error: 'Email could not be sent' });
  } finally {
    lock.releaseLock();
  }
}

function parsePayload(event) {
  if (!event || !event.postData || typeof event.postData.contents !== 'string') return null;
  try {
    return JSON.parse(event.postData.contents);
  } catch {
    return null;
  }
}

function constantTimeEquals(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const leftBytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, left);
  const rightBytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, right);
  if (leftBytes.length !== rightBytes.length) return false;
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}

function isUuid(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isBoundedString(value, maxLength) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

function isHttpsUrl(value) {
  return typeof value === 'string' &&
    /^https:\/\/[^/@\s]+(?:\/[^\s]*)?$/i.test(value);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function jsonResponse(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
