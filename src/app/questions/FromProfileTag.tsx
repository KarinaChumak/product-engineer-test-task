import { UserRound } from 'lucide-react';
import { FormattedMessage } from 'react-intl';
import { Tag } from '@/components/Tag';

/** Marks an answer that still comes from the candidate's profile. Every question type shows the same one. */
export function FromProfileTag() {
  return (
    <Tag icon={<UserRound aria-hidden="true" />}>
      <FormattedMessage id="question.fromProfile" />
    </Tag>
  );
}
