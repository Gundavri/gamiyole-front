<script>
  import { DeviceDetectorService } from "./services/deviceDetectorService.service";
  import { Link } from "svelte-routing";

  let container;
  let map;
  let zoom = 16;
  let center = { lat: DeviceDetectorService.latUni, lng: DeviceDetectorService.lngUni };
  let directionsService;
  let directionsRenderer;
  let count = 0;
  let startLocation;
  let endLocation;
  let marker;

  import { onMount } from "svelte";

  onMount(async () => {
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();
    map = new google.maps.Map(container, {
      zoom,
      center
    });
    marker = new google.maps.Marker({
        map: map,
        position: center,
        draggable: true
    });
    map.addListener("click", function(mapsMouseEvent) {
        marker.setPosition(mapsMouseEvent.latLng)
    });
    directionsRenderer.setMap(map);
  });
</script>

<style>
  .full-screen {
    width: 100vw;
    height: 90vh;
  }
</style>

<Link to='/'>Go back</Link>
<div class="full-screen" bind:this={container} />
<button on:click={()=>{
    console.log(marker.getPosition().lat(), marker.getPosition().lng())
}}>Submit</button>
