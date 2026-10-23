import { getMessages } from '../../../i18n';
import { formatTanggal } from '../../../utils/format';
import type { ToolboxMeeting } from '../types';
import { SafetyEmptyState } from './SafetyEmptyState';

const messages = getMessages().safety;

export function ToolboxMeetingList({
  meetings,
  projectNames,
  canCreate,
  onCreate,
}: {
  meetings: ToolboxMeeting[];
  projectNames: Map<string, string>;
  canCreate: boolean;
  onCreate: () => void;
}) {
  if (meetings.length === 0) {
    return <SafetyEmptyState text={messages.noToolboxMeetings} canCreate={canCreate} onCreate={onCreate} action={messages.addToolbox} />;
  }

  return meetings.map((meeting) => (
    <article key={meeting.id} className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:p-5">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-text">{meeting.topic}</h3>
          <p className="text-sm text-muted">
            {projectNames.get(meeting.project_id) ?? messages.project}
            {' · '}{formatTanggal(meeting.meeting_date, { timezone: 'WIB' })}
          </p>
        </div>
        <p className="text-sm font-semibold text-text">{messages.attendeesCount(meeting.attendees_count)}</p>
      </header>
      <p className="text-sm text-muted">{messages.presenter}: {meeting.presenter_name}</p>
      <ul className="list-inside list-disc space-y-1 text-sm text-text">
        {meeting.key_points.map((point, index) => <li key={`${meeting.id}-${index}`}>{point}</li>)}
      </ul>
    </article>
  ));
}
