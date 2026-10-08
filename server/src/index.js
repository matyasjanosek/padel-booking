import { createApp } from "./app.js";
import { startHoldExpiryJob } from "./jobs/holdExpiry.js";

const port = process.env.PORT || 4000;
const app = createApp();

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

startHoldExpiryJob();
