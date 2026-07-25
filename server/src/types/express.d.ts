import type { Notebook, User } from "../generated/prisma/client.js";

declare global {
  namespace Express {
    // Passport's `req.user` resolves to this interface.
    interface User extends Omit<import("../generated/prisma/client.js").User, never> {}

    interface Request {
      /** Populated by `loadNotebook` once ownership has been verified. */
      notebook?: Notebook;
    }
  }
}

export {};
