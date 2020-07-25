<script>
    import { onMount } from 'svelte';
    import { Link, navigate } from 'svelte-routing';
    import { AuthService } from '../services/auth.service';

    let visible = false;
    const authService = AuthService.getInstance();
    
    onMount(() => {
        authService.validateTokenAndNavigate().then(res => {
            if(res) {
                visible = true;
            }
        });
    });

</script>


<div class="wrapper">
    {#if visible}
        <Link to="/gamiyole">
            Gamiyole
        </Link>
        <Link to="/gagiyoleb">
            Gagiyoleb
        </Link>
    {:else}
        blaaaaaaaa
    {/if}
</div>