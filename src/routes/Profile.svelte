<script lang="typescript">
    import { onMount } from "svelte";
    import { AuthService } from "../services/auth.service";
    import { ProfileService } from "../services/profile.service";

    const authService = AuthService.getInstance();

    onMount(async () => {
        authService.validateTokenAndNavigate().then(res => {
        });
    });

    let profile;
    const profileService = ProfileService.getInstance();
    profileService.getUserProfile().then(data => profile = data?.user).catch(e => console.warn(e));
</script>

<style type="text/scss">
</style>

<div class="container">
    {#await profileService.getUserProfile()}
        <p>...waiting</p>
    {:then data}
        <p>{profile.name}</p>
    {:catch error}
        <p>An error occurred!</p>
    {/await}
</div>

