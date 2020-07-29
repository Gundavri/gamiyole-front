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
    <h1>Profile</h1>
    <hr>
    <div class="row">
        {#await profileService.getUserProfile()}
            <img src="/gifs/spinner.gif" alt="" style="margin: auto">
        {:then data}
            
            <!-- left column -->
            <div class="col-md-3">
            <div class="text-center">
                <img src="//placehold.it/100" class="avatar img-circle" alt="avatar">
            </div>
            </div>
            
            <!-- edit form column -->
            <div class="col-md-9 personal-info">
                <h3>Personal info</h3>
                <div class="row">
                    <div class="col-lg-2">First name:</div>
                    <div class="col-lg-6">{profile.name}</div>
                </div>
                <div class="row">
                    <div class="col-lg-2">Last name:</div>
                    <div class="col-lg-6">{profile.surname}</div>
                </div>
                <div class="row">
                    <div class="col-lg-2">Email:</div>
                    <div class="col-lg-6">{profile.email}</div>
                </div>
                <div class="row">
                    <div class="col-lg-2">Age:</div>
                    <div class="col-lg-6">{profile.age}</div>
                </div>
                <div class="row">
                    <div class="col-lg-2">Phone:</div>
                    <div class="col-lg-6">{profile.phone}</div>
                </div>
            </div>
        
        {:catch error}
            <p>An error occurred!</p>
        {/await}
    </div>
</div>

