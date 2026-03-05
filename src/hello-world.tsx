import { Detail } from "@raycast/api";

export default function HelloWorld() {
  const markdown = `
# Hello World!

This is your **Alertmanager** Raycast extension.

It's alive and working! Now we can build the real thing.
  `;

  return <Detail markdown={markdown} />;
}
