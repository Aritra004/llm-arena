import arcjet, { shield } from "@arcjet/next";

import { serverEnvironment } from "@/infrastructure/env";

const aj = arcjet({
  key: serverEnvironment.arcjetKey,
  rules: [shield({ mode: "LIVE" })],
});

export default aj;
