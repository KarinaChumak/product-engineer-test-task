import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router';
import { useJobs } from '@/app/useJobs';
import { Select } from '@/components/Select';
import { TopBar } from '@/components/TopBar';

export interface JobSwitcherProps {
  /** The job on screen, if any; it's shown as the selected one. */
  currentJobId?: string;
}

/**
 * A dropdown of every open job, in the page's top-left corner, that opens the one picked. It's a
 * shortcut, not part of the questionnaire: until the list loads, or if it fails, nothing is shown.
 */
export function JobSwitcher({ currentJobId }: JobSwitcherProps) {
  const intl = useIntl();
  const navigate = useNavigate();
  const jobs = useJobs();
  if (!jobs.data || jobs.data.length === 0) return null;

  const options = jobs.data.map((job) => ({
    value: job.id,
    label: job.company ? `${job.title} · ${job.company}` : job.title,
  }));
  const value = options.some((option) => option.value === currentJobId) ? currentJobId : undefined;

  return (
    <TopBar label={intl.formatMessage({ id: 'jobSwitcher.nav' })}>
      <Select
        label={intl.formatMessage({ id: 'jobSwitcher.label' })}
        labelHidden
        options={options}
        value={value}
        onValueChange={(id) => void navigate(`/jobs/${encodeURIComponent(id)}`)}
        placeholder={intl.formatMessage({ id: 'jobSwitcher.placeholder' })}
      />
    </TopBar>
  );
}
