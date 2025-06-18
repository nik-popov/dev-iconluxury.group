import { createFileRoute } from '@tanstack/react-router';
import FileExplorer  from  './explore';
export const Route = createFileRoute('/_layout/')({
  component: FileExplorer,
});
