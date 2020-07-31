<script>
  import { onMount } from "svelte";
  import { DeviceDetectorService } from "../services/deviceDetectorService.service";
  import { GoogleService } from "../services/google.service";
  import { Link } from "svelte-routing";
  import { AuthService } from "../services/auth.service";
  import { MatcherService } from "../services/matcher.service";
  import MapForRoutes from "../components/MapForRoutes.svelte";

  let destination;
  let isGamiyole;
  let isInitMap;
  let person;
  let declinedGamyoli;
  let acceptedGamyoli;
  let secondAccept;

  let gamyoleebisArr = [];
  let wamyoleArr = [];
  let acceptedGamyoleebisArr = [];
  let declinedGamyoleebisArr = [];

  let show = false;

  const authService = AuthService.getInstance();

  if (DeviceDetectorService.isBrowser) {
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        isInitMap = window.isInitMap;
      }, i * 100);
    }
  }

  onMount(() => {
    authService.validateTokenAndNavigate().then((res) => {});
    const url = new URL(location.href);
    const params = url.searchParams;
    destination = params.get("destination");
    isGamiyole = params.get("gamiyole") === "true";
    console.log(isGamiyole);
  });

  function onGamiyoleebi(event) {
    gamyoleebisArr = event.detail.arr;
    console.log("waitingRoomidan ", gamyoleebisArr);
  }

  function onWamyole(event) {
    show = false;
    wamyoleArr.push(event.detail.chosenBy);
    let forNoNeedAtAll = wamyoleArr;
    console.log(forNoNeedAtAll);
    wamyoleArr = forNoNeedAtAll;
    show = true;
  }
</script>

<style>
  .wrapper {
    width: 100%;
    height: 100%;
    position: relative;
  }

  .map {
    width: 50%;
    height: 100%;
    position: fixed;
    right: 0;
  }

  .suggestions {
    width: 50%;
    /* height: 100%; */
    position: absolute;
    left: 0;
    display: flex;
    flex-wrap: wrap;
    flex-flow: column;
    justify-content: center;
    align-items: center;
  }

  .card-body {
    cursor: pointer;
  }

  @media only screen and (max-width: 800px) {
    .map {
      width: 100%;
      height: 60%;
      top: 0;
    }

    .suggestions {
      width: 100%;
      height: 40%;
      bottom: 0;
    }
  }
</style>

<div class="wrapper">
  <div class="map">
    {#if isInitMap}
      <MapForRoutes
        class="map"
        on:gamiyoleebi={onGamiyoleebi}
        on:wamyole={onWamyole}
        startLocation="აგრარული უნივერსიტეტი (ეკლესია), D. Aghmashenebeli Ave,
        T'bilisi, Georgia"
        endLocation={destination}
        {person}
        {acceptedGamyoli}
        {declinedGamyoli}
        {secondAccept} />
    {/if}
  </div>
  <div class="suggestions">
    {#if !isGamiyole}
      {#each gamyoleebisArr as gamyoleli}
        <div class="inner-div">
          <!-- {JSON.stringify(gamyoleli)}-->
          <div class="card" style="width: 18rem;">
            <div class="card-body" on:click={() => (person = gamyoleli)}>
              <h5 class="card-title">Email: {gamyoleli.email}</h5>
              <h6 class="card-subtitle mb-2 text-muted">
                Time: {gamyoleli.startTime} - {gamyoleli.endTime}
              </h6>
              <!-- <Link type="button" class="btn btn-primary" to="----------------AQ CHAWERE LASHA, EMAILI GVAQVS--------------" >Profile</Link> -->
              <button
                type="button"
                class="btn btn-success"
                on:click={() => {
                  acceptedGamyoleebisArr.push(gamyoleli);
                  gamyoleebisArr = gamyoleebisArr.filter((g) => !declinedGamyoleebisArr.find((r) => r.email === g.email) && !acceptedGamyoleebisArr.find((r) => r.email === g.email));
                  acceptedGamyoli = gamyoleli;
                }}>
                Accept
              </button>
              <button
                type="button"
                class="btn btn-danger"
                on:click={() => {
                  declinedGamyoleebisArr.push(gamyoleli);
                  gamyoleebisArr = gamyoleebisArr.filter((g) => !declinedGamyoleebisArr.find((r) => r.email === g.email) && !acceptedGamyoleebisArr.find((r) => r.email === g.email));
                  declinedGamyoli = gamyoleli;
                }}>
                Decline
              </button>
            </div>
          </div>
        </div>
      {/each}
    {:else if show}
      {#each wamyoleArr as wamyoleli}
        <div class="inner-div">
          <!-- {JSON.stringify(gamyoleli)}-->
          <div class="card" style="width: 18rem;">
            <div class="card-body" on:click={() => (person = wamyoleli)}>
              <h5 class="card-title">Email: {wamyoleli.email}</h5>
              <h6 class="card-subtitle mb-2 text-muted">
                Time: {wamyoleli.time}
              </h6>
              <!-- <Link type="button" class="btn btn-primary" to="----------------AQ CHAWERE LASHA, EMAILI GVAQVS--------------" >Profile</Link> -->
              <button
                type="button"
                class="btn btn-success"
                on:click={() => {
                  acceptedGamyoleebisArr.push(wamyoleli);
                  wamyoleArr = wamyoleArr.filter((g) => !declinedGamyoleebisArr.find((r) => r.email === g.email) && !acceptedGamyoleebisArr.find((r) => r.email === g.email));
                  secondAccept = wamyoleli
                }}>
                Accept
              </button>
              <button
                type="button"
                class="btn btn-danger"
                on:click={() => {
                  declinedGamyoleebisArr.push(wamyoleli);
                  wamyoleArr = wamyoleArr.filter((g) => !declinedGamyoleebisArr.find((r) => r.email === g.email) && !acceptedGamyoleebisArr.find((r) => r.email === g.email));
                }}>
                Decline
              </button>
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>
