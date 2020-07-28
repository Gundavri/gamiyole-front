<script>
  import { DeviceDetectorService } from "../services/deviceDetectorService.service";
  import Map from "../components/Map.svelte";
  import { GoogleService } from "../services/google.service";
  

  const googleService = GoogleService.getInstance()

</script>

<style>
  :global(body) {
    padding: 0;
  }
</style>

{#if googleService.mapLoaded}
  <Map />
{/if}
