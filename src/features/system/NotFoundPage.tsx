import { Compass, ListChecks, SquaresFour } from '@phosphor-icons/react';
import { Button } from '../../components/ui';
import { StatusPage } from '../../components/system/StatusPage';

export function NotFoundPage({
  onNavigate,
  path,
}: {
  onNavigate: (route: string) => void;
  /** The address that did not match a page, shown verbatim. */
  path?: string;
}) {
  return (
    <StatusPage
      code="404"
      icon={<Compass size={20} weight="bold" />}
      title="This page does not exist"
      description={
        <>
          Nothing matches {path ? <code className="meta">{path}</code> : 'that address'}.
          Your tasks, habits and notes are untouched. Pick a page to continue.
        </>
      }
      actions={
        <>
          <Button onClick={() => onNavigate('dashboard')}>
            <SquaresFour size={15} weight="bold" />
            Go to today
          </Button>
          <Button variant="outline" onClick={() => onNavigate('tasks')}>
            <ListChecks size={15} weight="bold" />
            Open all tasks
          </Button>
        </>
      }
    />
  );
}
