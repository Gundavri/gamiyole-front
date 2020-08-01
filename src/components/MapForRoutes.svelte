<script>
  import { DeviceDetectorService } from "../services/deviceDetectorService.service";
  import { Link } from "svelte-routing";
  import { GoogleService } from "../services/google.service";
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";
  import { MatcherService } from "../services/matcher.service"
  import { createEventDispatcher } from 'svelte';

      
  const dispatch = createEventDispatcher();
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
  let marker;
  let matcherService;
  let connected = false;
  export let startLocation = "";
  export let endLocation = "";
  export let person;
  export let acceptedGamyoli;
  export let declinedGamyoli;
  export let secondAccept;

  $: {
    if(person && marker && person.lat && person.lng) {
      marker.setVisible(true);
      let latLng = new google.maps.LatLng(person.lat, person.lng)
      marker.setPosition(latLng);
      map.panTo(latLng);
    }
  }
  
  $: {
    if(connected && acceptedGamyoli) {
      matcherService.send({
        content: JSON.stringify({
          key: "Accapted Gamyoli",
          email: acceptedGamyoli.email
        })
      });
    }
  }

  $: {
    if(connected && declinedGamyoli) {
      matcherService.send({
        content: JSON.stringify({
          key: "Declined Gamyoli",
          email: declinedGamyoli.email
        })
      });
    }
  }

  $:{
    if(connected && secondAccept) {
      matcherService.send({
        content: JSON.stringify({
          key: "Accepted Wamyoli",
          email: secondAccept.email
        })
      });
    }
  }

  onMount(async () => {
    const url = new URL(location.href);
    const params = url.searchParams;
    const gamiyole = params.get("gamiyole") === "true";
    const destination = params.get("destination");
    const startTime = params.get("startTime");
    const endTime = params.get("endTime");
    const time = params.get("time");
    const seats = params.get("seats");

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();
    matcherService = MatcherService.getInstance();
    matcherService.connect(event => {
      const parsedData = JSON.parse(JSON.parse(event.data).content);
      console.log(parsedData);
      window.e = event;
      if(parsedData.isGamyoleebi) {
        dispatch('gamiyoleebi', parsedData);
      }
      if(parsedData.isWamyole) {
        dispatch('wamyole', parsedData);
      }
      if(parsedData.timeToChat) {
        window.open(`http://localhost:3000/chat?to=${secondAccept?secondAccept.email:acceptedGamyoli.email}`, "_blank");
      }
    })
      .then(() => {
        connected = true;
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
        matcherService.send(toSend);
      });

    map = new google.maps.Map(container, {
      zoom,
      center,
    });
    marker = new google.maps.Marker({
      map,
      visible: false
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
