<script lang="typescript">
    import { onMount } from "svelte";
    import { AuthService } from "../services/auth.service";
    import { ProfileService } from "../services/profile.service";
    import { navigate } from "svelte-routing";

    const authService = AuthService.getInstance();
    let profile = {
        name: '',
        phone: '',
        email: '',
        age: 0,
        surname: ''
    };
    let profileSnapShot;

    onMount(async () => {
        authService.validateTokenAndNavigate().then(res => {
        });
        profile = await profileService.getUserProfile(authService);
        profileSnapShot = Object.assign({}, profile);
    });

    const profileService = ProfileService.getInstance();

    function saveChanges() {
        profileService.updateUserProfile(profile, authService).then(() => console.log('he'));
    }

    function reset() {
        profile = Object.assign({}, profileSnapShot);
    }
</script>

<style type="text/scss">
    .row{
        margin: 20px 0;
    }
</style>

<div class="container">
    <h1>Profile</h1>
    <hr>
    <div class="row">
        <!-- left column -->
        <div class="col-md-3">
        <div class="text-center">
            <img src="//placehold.it/100" class="avatar img-circle" alt="avatar">
        </div>
        </div>
        
        <!-- edit form column -->
        <div class="col-md-9 personal-info">
            <h3>Personal info</h3>
            <form role="form" on:submit|preventDefault={saveChanges}>
                <div class="row">
                    <div class="col-lg-2">First name:</div>
                    <div class="col-lg-6">
                        <input class="form-control" type="text" bind:value="{profile.name}">
                    </div>
                </div>
                <div class="row">
                    <div class="col-lg-2">Last name:</div>
                    <div class="col-lg-6">
                        <input class="form-control" type="text" bind:value="{profile.surname}">
                    </div>
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
                    <div class="col-lg-6">
                        <input class="form-control" type="text" bind:value="{profile.phone}">
                    </div>
                </div>
                <div class="col-md-8">
                    <input type="submit" class="btn btn-primary" value="Save Changes">
                    <span></span>
                    <input type="reset" on:click="{() => reset()}" class="btn btn-default" value="Cancel">
                </div>
            </form>
        </div>
    </div>
</div>

