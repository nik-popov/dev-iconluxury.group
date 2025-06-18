import { createFileRoute } from '@tanstack/react-router';
import FileExplorer  from  './dropship';
export const Route = createFileRoute('/_layout/')({
  component: FileExplorer,
});
