<script>
  import { DeviceDetectorService } from "../services/deviceDetectorService.service";
  import { Link } from "svelte-routing";
  import { GoogleService } from "../services/google.service";
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";
  import { MatcherService } from "../services/matcher.service"

  const googleService = GoogleService.getInstance();
  let container;
  let map;
  let zoom = 16;
  let center = {
    lat: DeviceDetectorService.latUni,
    lng: DeviceDetectorService.lngUni,
  };
  let directionsService;
  let directionsRenderer;
  export let startLocation = "";
  export let endLocation = "";
  export let gamiyole;

  onMount(async () => {
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();
    const matcherService = MatcherService.getInstance();
    matcherService.connect( event => {
      console.log(JSON.parse(JSON.parse(event.data).content));
    });
    map = new google.maps.Map(container, {
      zoom,
      center,
    });
    directionsRenderer.setMap(map);
    directionsService.route(
      {
        origin: startLocation,
        destination: endLocation,
        travelMode: "DRIVING",
      },
      function (response, status) {
        if (status === "OK") {
          directionsRenderer.setDirections(response);
        } else {
          window.alert("Directions request failed due to " + status);
        }
        let arr = response.routes[0].overview_path;
        let path = arr.map((element) => {
          return new google.maps.LatLng(element.lat(), element.lng());
        });
        let line = new google.maps.Polyline({ path });
        console.log(path);
        line.setMap(map);
        if (google.maps.geometry.poly.isLocationOnEdge( new google.maps.LatLng(41.801974, 44.773849), 
                                                                                      line, 0.00178402)) {
          // /alert("Relocate!");
        }
      }
    );
  });
</script>

<style>
  .full-screen {
    width: 100%;
    height: 100%;
  }
</style>

<div class="full-screen" bind:this={container} />
