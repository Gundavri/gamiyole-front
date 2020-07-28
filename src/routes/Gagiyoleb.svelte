<script>
  import { onMount } from 'svelte';
  import { DeviceDetectorService } from "../services/deviceDetectorService.service";
  import { GoogleService } from "../services/google.service";
  import { Link } from "svelte-routing";
  import { AuthService } from "../services/auth.service";

  const googleService = GoogleService.getInstance();
  const authService = AuthService.getInstance();

  const dateHours = new Date().getHours();
  const dateMinutes = new Date().getMinutes();
  let fromUni,
    destination = "",
    seats = 1,
    time =
      (dateHours < 10 ? "0" : "") +
      dateHours +
      ":" +
      (dateMinutes < 10 ? "0" : "") +
      dateMinutes;
  let predictions = [];
  let clicked = false;

  $: {
    console.log(time);
  }

  $: {
    console.log(seats);
  }

  onMount(async () => {
    authService.validateTokenAndNavigate().then(res => {
    });
  });


  if (DeviceDetectorService.isBrowser && window.navigator) {
    isAtUni();
  }

  function isAtUni() {
    let lat, lng;
    navigator.geolocation.getCurrentPosition((pos) => {
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;

      const distanceFromCenter = Math.sqrt(
        Math.pow(lat - DeviceDetectorService.latUni, 2) +
          Math.pow(lng - DeviceDetectorService.lngUni, 2)
      );

      if (distanceFromCenter <= DeviceDetectorService.maxAllowedDist) {
        fromUni = true;
      } else {
        fromUni = false;
      }
    });
  }

  function onSubmit() {
    console.log("submit");
  }

  function getAutoCompletedData() {
    if (DeviceDetectorService.isBrowser) {
      googleService.getSuggestedPlaces(destination).then((res) => {
        predictions = res;
      });
    }
  }
</script>

<style type="scss">
  .wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  form {
    width: 350px;

    .action {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  }
</style>

<div class="wrapper">
  <form>
    <div class="form-group">
      <label>{fromUni ? 'To' : 'From'}</label>
      <input
        bind:value={destination}
        type="search"
        class="form-control"
        placeholder={fromUni ? 'To' : 'From'}
        on:input={(res) => {
          getAutoCompletedData();
          clicked = false;
        }} />
    </div>
    {#if destination !== '' && !clicked}
      <div>
        {#each predictions as prediction}
          <input
            type="text"
            class="form-control"
            value="{prediction}/"
            readonly
            on:click={(res) => {
              destination = prediction;
              clicked = true;
            }} />
        {/each}
      </div>
    {/if}
    <div>
      {#if destination === ''}
        <Link to="/map">Pic on Map</Link>
      {:else}
        <Link to="/map?destination={destination}">Show on Map</Link>
      {/if}
    </div>
    <div class="form-group">
      <label>Time</label>
      <input
        bind:value={time}
        type="time"
        class="form-control"
        placeholder="Time" />
    </div>
    <div class="form-group">
      <label>Number of Seats</label>
      <input
        bind:value={seats}
        type="number"
        class="form-control"
        placeholder="Number of Seats" />
    </div>
    <div class="action">
      <button type="button" class="btn btn-primary" on:click={onSubmit}>
        Gagiyoleb
      </button>
    </div>
  </form>
</div>
