import { exampleRouter } from "@/server/api/routers/example";
import { createTRPCRouter } from "@/server/api/trpc";
import { eventRouter } from "@/server/api/routers/event";
import { userRouter } from "@/server/api/routers/user";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  example: exampleRouter,
  eventRouter: eventRouter,
  userRouter: userRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
