<script>
  import { onMount } from "svelte";
  import { DeviceDetectorService } from "../services/deviceDetectorService.service";
  import { GoogleService } from "../services/google.service";
  import { Link } from "svelte-routing";
  import { AuthService } from "../services/auth.service";
  import { MatcherService } from "../services/matcher.service";

  onMount(() => {
    const url = new URL(location.href);
    const params = url.searchParams;
    const gamiyole = params.get("gamiyole") === "true";
    const destination = params.get("destination");
    const startTime = params.get("startTime");
    const endTime = params.get("endTime");
    const time = params.get("time");
    const seats = params.get("seats");
    const matcherService = MatcherService.getInstance();
    matcherService.connect().then(() => {
      let toSend = {};
      if(gamiyole) {
        toSend = {
          gamiyole,
          destination,
          startTime,
          endTime,
          fromUni : DeviceDetectorService.isAtUni()
        }
      }
      else {
        toSend = {
          gamiyole,
          destination,
          time,
          seats,
          fromUni : DeviceDetectorService.isAtUni()
        }
      }
      matcherService.send(toSend)
    });
  });
</script>

hello
