<script>
  import { DeviceDetectorService } from "../services/deviceDetectorService.service";
  import { Link } from "svelte-routing";
  import { GoogleService } from '../services/google.service';
  import { onMount } from "svelte";

  const googleService = GoogleService.getInstance();
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


  onMount(async () => {
    const url = new URL(location.href);
    const destination = url.searchParams.get('destination');
    
    if(destination) {
      const res = await googleService.getGeometryForPlace(destination);
      if(res.candidates.length !== 0) {
        center = res.candidates[0].geometry.location;
      }
    }

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
