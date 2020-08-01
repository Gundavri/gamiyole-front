<script>
    import { onMount } from 'svelte';
    import { Link } from 'svelte-routing';
    import { AuthService } from '../services/auth.service';

    const authService = AuthService.getInstance();

    let isLoading = true;
    let isError = false;
    let errorMsg = '';
    
    onMount(() => {
        const url = new URL(location.href);
        const hash = url.searchParams.get('hash');
        if(!hash) {
            isError = true;
            isLoading = false;
            errorMsg = 'Invalid Hash';
        }

        authService.verifyUser(hash).then(res => {
            isLoading = false;
            if(res.error) {
                isError = true;
                errorMsg = res.error;
            }
        });

    });


</script>


<div class="wrapper">
    {#if isLoading}
        Loading ...
    {/if}

    {#if !isLoading && isError}
        Error: {errorMsg}
    {/if}

    {#if !isLoading && !isError}
        Your account has been successfuly verified. <br>
        Go to <Link to="/login">Login Page</Link> 
    {/if}

</div>


