<script>
  import { ChatService } from "../services/chat.service";
  import { AuthService } from "../services/auth.service";
  import { onMount } from "svelte";

  const authService = AuthService.getInstance()

  let chatReady = false;
  let chatService;
  let msg;
  let text = "";
  let to;

  onMount(() => {
    authService.validateTokenAndNavigate().then((res) => {});
    const url = new URL(location.href);
    to = url.searchParams.get("to");
    chatService = ChatService.getInstance();
    chatService
      .connect(to, (event) => {
          console.log(event.data);
        text += to + ": " + JSON.parse(event.data).content + "\n";
      })
      .then(() => {
        chatReady = true;
      });
  });

  function onClick() {
    chatService.send(msg, to);
    text += "Me: " + msg + "\n";
    msg = "";
  }
</script>

{#if chatReady}
  <table>
    <tr>
      <td>
        <textarea rows="10" cols="80" id="log" title="Chat" bind:value={text} />
      </td>
    </tr>
    <tr>
      <td>
        <input type="text" size="51" id="msg" placeholder="Message" bind:value={msg}/>
        <button type="button" on:click={onClick}>Send</button>
      </td>
    </tr>
  </table>
{/if}
