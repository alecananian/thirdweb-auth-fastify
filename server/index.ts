import { ThirdwebAuth } from "@thirdweb-dev/auth/fastify";
import { PrivateKeyWallet } from "@thirdweb-dev/auth/evm";
import { config } from "dotenv";
import Fastify from "fastify";

config();

const app = Fastify();
const PORT = 8000;

// NOTE: This users map is for demo purposes. Its used to show the power of
// what you can accomplish with the Auth callbacks. In a production app,
// you would want to store this data somewhere externally, like a database or
// on-chain.
const users: Record<string, any> = {};

const { authRouter, authMiddleware, getUser } = ThirdwebAuth({
  domain: process.env.THIRDWEB_AUTH_DOMAIN || "",
  wallet: new PrivateKeyWallet(process.env.THIRDWEB_AUTH_PRIVATE_KEY || ""),
  // NOTE: All these callbacks are optional! You can delete this section and
  // the Auth flow will still work.
  callbacks: {
    onLogin: async (address) => {
      // Here we can run side-effects like creating and updating user data
      // whenever a user logs in.
      if (!users[address]) {
        users[address] = {
          created_at: Date.now(),
          last_login_at: Date.now(),
          num_log_outs: 0,
        };
      } else {
        users[address].last_login_at = Date.now();
      }

      // We can also provide any session data to store in the user's session.
      return { role: ["admin"] };
    },
    onUser: async (user) => {
      // Here we can run side-effects whenever a user is fetched from the client side
      if (users[user.address]) {
        users[user.address].user_last_accessed = Date.now();
      }

      // And we can provide any extra user data to be sent to the client
      // along with the default user object.
      return users[user.address];
    },
    onLogout: async (user) => {
      // Finally, we can run any side-effects whenever a user logs out.
      if (users[user.address]) {
        users[user.address].num_log_outs++;
      }
    },
  },
});

// Now we add the auth router to our app to set up the necessary auth routes
app.register(authRouter, { prefix: "/auth" });

// We add the auth middleware to our app to let us access the user across our API
app.register(authMiddleware);

app.get("/secret", async (req, res) => {
  const user = await getUser(req);

  if (!user) {
    return res.code(401).send({
      message: "Not authorized.",
    });
  }

  return res.code(200).send({
    message: "This is a secret... don't tell anyone.",
  });
});

app.listen({ port: PORT }, (err, address) => {
  if (err) {
    console.error("Error starting server:", err);
    process.exit(1);
  }

  console.log(`Server listening at ${address}`);
});
