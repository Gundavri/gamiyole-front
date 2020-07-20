<script>
  import { Router, Route, Link } from "svelte-routing";

  import Login from './routes/Login.svelte';
  import Register from './routes/Register.svelte';
  import Profile from './routes/Profile.svelte';

  // Used for SSR. A falsy value is ignored by the Router.
  export let url = "";
</script>

<Router url="{url}">
	  <Route path="login" component="{Login}" />
	  <Route path="register" component="{Register}" />
	  <Route path="profile" component="{Profile}" />
</Router>
