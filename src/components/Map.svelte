<script>
  import { DeviceDetectorService } from "../services/deviceDetectorService.service";
  import { Link } from "svelte-routing";
  import { GoogleService } from '../services/google.service';
  import { onMount } from "svelte";
  import { navigate } from 'svelte-routing';

  const googleService = GoogleService.getInstance();
  let container;
  let map;
  let zoom = 16;
  let center = { lat: DeviceDetectorService.latUni, lng: DeviceDetectorService.lngUni };
  let directionsService;
  let directionsRenderer;
  let geoCoder;
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

    geoCoder = new google.maps.Geocoder();
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
    window.marker = marker;
    map.addListener("click", function(mapsMouseEvent) {
        marker.setPosition(mapsMouseEvent.latLng)
    });
    directionsRenderer.setMap(map);
  });

  function onSubmit() {
    const url = new URL(location.href);
    const startTime = url.searchParams.get('startTime');
    const endTime = url.searchParams.get('endTime');
    const time = url.searchParams.get('time');
    const seats = url.searchParams.get('seats');
    let destination;

    geoCoder.geocode({
        location: {
          lat: marker.getPosition().lat(),
          lng: marker.getPosition().lng()
        }
      }, (results, status) => {
        if (status === "OK") {
          if (results[0]) {
            console.log(results);
            destination = results[0].formatted_address;
            console.log(destination);
            if(startTime && endTime) {
              // Came from Gamiyole
              navigate(`/gamiyole?destination=${destination}&startTime=${startTime}&endTime=${endTime}`);
            } else {
              // Came from Gagiyole
              navigate(`/gagiyoleb?destination=${destination}&time=${time}&seats=${seats}`);
            }
          } else {
            window.alert("No results found");
          }
        } else {
          window.alert("Geocoder failed due to: " + status);
        }
    });

  }

</script>

<style>
  .full-screen {
    width: 100%;
    height: 80%;
  }
</style>

<div class="full-screen" bind:this={container} />
<button type="button" class="btn btn-primary" on:click={onSubmit}>Submit</button>
