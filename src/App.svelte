<script>
  import { Router, Route, Link } from "svelte-routing";

  import Login from './routes/Login.svelte';
  import Register from './routes/Register.svelte';
  import Profile from './routes/Profile.svelte';
  import Home from './routes/Home.svelte';
  import Gamiyole from './routes/Gamiyole.svelte';
  import Gagiyoleb from './routes/Gagiyoleb.svelte';

  // Used for SSR. A falsy value is ignored by the Router.
  export let url = "";
</script>

<Router url="{url}">
	  <Route path="login" component="{Login}" />
	  <Route path="register" component="{Register}" />
    <Route path="profile" component="{Profile}" />
    <Route path="/" component="{Home}" />
    <Route path="gamiyole" component="{Gamiyole}" />
    <Route path="gagiyoleb" component="{Gagiyoleb}" />
</Router>
