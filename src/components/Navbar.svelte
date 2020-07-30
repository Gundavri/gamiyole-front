<script>
    import { navigate } from "svelte-routing";
    import { onMount } from "svelte";
    import { AuthService } from "../services/auth.service";

    const Routes = [
        {
            route: '/login',
            label: 'Login'
        },
        {
            route: '/profile',
            label: 'profile'
        },
        {
            route: '/register',
            label: 'Register'
        },
        {
            route: '/gamiyole',
            label: 'Gamiyole'
        },
        {
            route: '/gagiyoleb',
            label: 'Gagiyoleb'
        }
    ];

    const Routes_For_Authenticated_Users =[
        {
            route: '/logout',
            label: 'Logout',
            isLogout: true
        },
        {
            route: '/profile',
            label: 'profile'
        },
        {
            route: '/gamiyole',
            label: 'Gamiyole'
        },
        {
            route: '/gagiyoleb',
            label: 'Gagiyoleb'
        }
    ]

    let currRoutes = Routes;
    const authService = AuthService.getInstance();

    onMount(async () => {
        authService.validateTokenAndNavigate().then(res => {
            if(res) currRoutes = Routes_For_Authenticated_Users;
            else currRoutes = Routes;
        });
    });

    function onNavigate(route) {
        if (route.isLogout === true){
            authService.deleteToken();
            if (authService.getToken() === null) currRoutes = Routes; 
        } else {
            navigate(route.route);
        }
    }
    
</script>

<style>
    .nav-link{
        cursor: pointer;
    }
</style>

<nav class="navbar navbar-expand-lg navbar-dark bg-dark">
    <span class="navbar-brand" on:click="{() => navigate("/")}">
      <svg id="Layer_3" style="height: 40px; width: 40px; fill: white" enable-background="new 0 0 64 64" height="512" viewBox="0 0 64 64" width="512" xmlns="http://www.w3.org/2000/svg"><g><path d="m21 51.721-4.923-1.641-1.077.538v2.382h6z"/><path d="m43 59v2h4v-2.101c-.323.066-.658.101-1 .101z"/><path d="m17 58.899v2.101h4v-2h-3c-.342 0-.677-.035-1-.101z"/><path d="m43 51.721v1.279h6v-2.382l-1.077-.538z"/><path d="m41 54v-3c0-.431.275-.812.684-.948l3.155-1.052h-25.678l3.155 1.052c.409.136.684.517.684.948v3c0 .553-.447 1-1 1h-6.816c.414 1.161 1.514 2 2.816 2h28c1.302 0 2.402-.839 2.816-2h-6.816c-.553 0-1-.447-1-1zm-2 1h-14v-2h14z"/><path d="m15.586 47h-2.586v2h.764l2.548-1.274z"/><path d="m47.688 47.726 2.548 1.274h.764v-2h-2.586z"/><path d="m22.789 40.658-3.171 6.342h24.764l-3.171-6.342c-.512-1.022-1.54-1.658-2.683-1.658h-13.056c-1.143 0-2.171.636-2.683 1.658z"/><path d="m34 11v-2c0-1.103-.897-2-2-2s-2 .897-2 2v2c0 1.103.897 2 2 2s2-.897 2-2z"/><path d="m26 18v2.981c.617.465 1.284.865 2 1.178v-3.159h2v3.798c.646.132 1.315.202 2 .202s1.354-.07 2-.202v-3.798h2v3.159c.716-.314 1.383-.713 2-1.178v-2.981c0-1.654-1.346-3-3-3h-6c-1.654 0-3 1.346-3 3z"/><path d="m24 18c0-2.613 2.022-4.74 4.579-4.957-.359-.6-.579-1.294-.579-2.043v-2c0-2.206 1.794-4 4-4s4 1.794 4 4v2c0 .749-.22 1.443-.579 2.043 2.557.217 4.579 2.344 4.579 4.957v.974c1.25-1.669 2-3.733 2-5.974 0-5.514-4.486-10-10-10s-10 4.486-10 10c0 2.241.75 4.305 2 5.974z"/><path d="m9 26v-2c0-2.206 1.794-4 4-4s4 1.794 4 4v2c0 .749-.22 1.443-.579 2.043 2.557.217 4.579 2.344 4.579 4.957v1.974c1.25-1.669 2-3.733 2-5.974 0-5.514-4.486-10-10-10s-10 4.486-10 10c0 2.241.75 4.305 2 5.974v-1.974c0-2.613 2.022-4.74 4.579-4.957-.359-.6-.579-1.294-.579-2.043z"/><path d="m13 39c.685 0 1.354-.07 2-.202v-4.798h2v4.159c.716-.314 1.383-.713 2-1.178v-3.981c0-1.654-1.346-3-3-3h-6c-1.654 0-3 1.346-3 3v3.981c.617.465 1.284.865 2 1.178v-4.159h2v4.798c.646.132 1.315.202 2 .202z"/><path d="m11 24v2c0 1.103.897 2 2 2s2-.897 2-2v-2c0-1.103-.897-2-2-2s-2 .897-2 2z"/><path d="m61 29c0-5.514-4.486-10-10-10s-10 4.486-10 10c0 2.241.75 4.305 2 5.974v-1.974c0-2.613 2.022-4.74 4.579-4.957-.359-.6-.579-1.294-.579-2.043v-2c0-2.206 1.794-4 4-4s4 1.794 4 4v2c0 .749-.22 1.443-.579 2.043 2.557.217 4.579 2.344 4.579 4.957v1.974c1.25-1.669 2-3.733 2-5.974z"/><path d="m54 30h-6c-1.654 0-3 1.346-3 3v3.981c.617.465 1.284.865 2 1.178v-4.159h2v4.798c.646.132 1.315.202 2 .202s1.354-.07 2-.202v-4.798h2v4.159c.716-.314 1.383-.713 2-1.178v-3.981c0-1.654-1.346-3-3-3z"/><path d="m53 26v-2c0-1.103-.897-2-2-2s-2 .897-2 2v2c0 1.103.897 2 2 2s2-.897 2-2z"/></g></svg>
    </span>
    <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="navbarNav">
      <ul class="navbar-nav">
        {#each currRoutes as route}
            <li class="nav-item">
                <span 
                    class="{route.isLogout !== undefined ? 'nav-link text-danger' : 'nav-link'}" 
                    on:click="{() => onNavigate(route)}"
                >{route.label}</span>
            </li>
        {/each}
      </ul>
    </div>
</nav>