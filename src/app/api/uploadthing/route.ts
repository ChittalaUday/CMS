import { createRouteHandler } from 'uploadthing/next';

import { ourFileRouter } from '@/lib/upload/uploadthing';

export const { GET, POST } = createRouteHandler({ router: ourFileRouter });
