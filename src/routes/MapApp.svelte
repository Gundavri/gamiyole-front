<script>
  import { onMount } from 'svelte';
  import { DeviceDetectorService } from "../services/deviceDetectorService.service";
  import Map from "../components/Map.svelte";
  import { GoogleService } from "../services/google.service";
  import { AuthService } from "../services/auth.service";

  const authService = AuthService.getInstance();

  let isInitMap = false;

  onMount(async () => {
    authService.validateTokenAndNavigate().then(res => {
    });
  });

  if(DeviceDetectorService.isBrowser) {
    for(let i=0; i<10; i++) {
      setTimeout(() => {
        isInitMap = window.isInitMap
      }, i*100);
    }
  }

</script>

<style>
  :global(body) {
    padding: 0;
  }
</style>


{#if DeviceDetectorService.isBrowser && isInitMap}
  <Map />
{/if}
