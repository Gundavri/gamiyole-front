<script>
  import { onMount } from "svelte";
  import { DeviceDetectorService } from "../services/deviceDetectorService.service";
  import { GoogleService } from "../services/google.service";
  import { Link } from "svelte-routing";
  import { AuthService } from "../services/auth.service";
  import { MatcherService } from "../services/matcher.service";
  import MapForRoutes from "../components/MapForRoutes.svelte";

  let destination;
  let gamiyole;
  let isInitMap;

  const authService = AuthService.getInstance();

  if(DeviceDetectorService.isBrowser) {
    for(let i=0; i<10; i++) {
      setTimeout(() => {
        isInitMap = window.isInitMap
      }, i*100);
    }
  }

  onMount(() => {
    authService.validateTokenAndNavigate().then(res => {});
    const url = new URL(location.href);
    const params = url.searchParams;
    gamiyole = params.get("gamiyole") === "true";
    destination = params.get("destination");
    const startTime = params.get("startTime");
    const endTime = params.get("endTime");
    const time = params.get("time");
    const seats = params.get("seats");
    const matcherService = MatcherService.getInstance();
    // matcherService.connect().then(() => {
    //   let toSend = {};
    //   if(gamiyole) {
    //     toSend = {
    //       gamiyole,
    //       destination,
    //       startTime,
    //       endTime,
    //       fromUni : DeviceDetectorService.isAtUni()
    //     }
    //   }
    //   else {
    //     toSend = {
    //       gamiyole,
    //       destination,
    //       time,
    //       seats,
    //       fromUni : DeviceDetectorService.isAtUni()
    //     }
    //   }
    //   matcherService.send(toSend)
    // });
  });
</script>

<style>
  .wrapper {
    width: 100vw;
    height: 100vh;
    position: relative;
  }

  .map {
    width: 50vw;
    height: 100vh;
    position: absolute;
    right: 0;
  }

  .suggestions {
    width: 50vw;
    height: 100vh;
    position: absolute;
    left: 0;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  @media only screen and (max-width: 800px) {
    .map {
      width: 100vw;
      height: 60vh;
      top: 0;
    }

    .suggestions {
      width: 100vw;
      height: 40vh;
      bottom: 0;
    }
  }
</style>

<div class="wrapper">
  <div class="map">
    {#if isInitMap}
      <MapForRoutes class="map" startLocation="აგრარული უნივერსიტეტი (ეკლესია), D. Aghmashenebeli Ave, T'bilisi, Georgia" endLocation={destination} gamiyole={gamiyole}/>
    {/if}
  </div>
  <div class="suggestions">
    hi<br>
    hi<br>
    
    hi<br>
    
    hi<br>
    
    hi<br>
  </div>
</div>