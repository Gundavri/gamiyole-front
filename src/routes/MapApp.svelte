<script>
  import { DeviceDetectorService } from "../services/deviceDetectorService.service";
  import Map from "../Map.svelte";

  let ready = false;
  if (DeviceDetectorService.isBrowser) {
    window.initMap = function() {
      ready = true;
    };
  }
</script>

<style>
  :global(body) {
    padding: 0;
  }
</style>

<svelte:head>
  <script
    defer
    async
    src="https://maps.googleapis.com/maps/api/js?key=AIzaSyCAqZrL_-ZKPZ4q4gd_ct4SsLB39md6dd0&callback=initMap">

  </script>
</svelte:head>

{#if ready}
  <Map />
{/if}
