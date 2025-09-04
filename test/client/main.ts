import { TextLineStream } from "@std/streams";

console.log("CLI chat client starting...");
console.log("CLI chat client started!");

let isRunning = true;
while (isRunning) {
  for await (
    const input of Deno.stdin.readable
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TextLineStream())
  ) {
    const isCommand = input.startsWith("/");
    if (isCommand) {
      const [command, argString] = input.split(" ", 2);
      switch (command) {
        case "/register":
          console.log("Registering...", argString);
          break;

        case "/exit":
          console.log("Exiting chat app");
          isRunning = false;
          Deno.exit();
          break;
        default:
          console.log("Unrecognized command");
      }
    }
  }
}
