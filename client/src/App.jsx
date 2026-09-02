import { useEffect, useState } from "react";

export default function App() {
  const [serverStatus, setServerStatus] = useState("checking");

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setServerStatus(data.status))
      .catch(() => setServerStatus("unreachable"));
  }, []);

  return (
    <main>
      <h1>Padel Centre</h1>
      <p>Server status: {serverStatus}</p>
    </main>
  );
}
