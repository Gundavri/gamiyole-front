<script lang="typescript">
    import { onMount } from 'svelte';
    import { Link, navigate } from "svelte-routing";
    import { AuthService } from '../services/auth.service';

    
    let submitClicked = false;
    let loginError = false;
    let email = '', password = '';

    const authService = AuthService.getInstance();

    onMount(() => {
        authService.deleteToken();
    });

    function isValidInputs() {
        return (email.length >= 6 && email.length <= 64) &&
            (password.length >= 6 && password.length <= 64) &&
            authService.emailRegex.test(email);
    }

    async function onSubmit() {
        submitClicked = true;
        if(isValidInputs) {
            let res = await authService.login(email, password);
            if(!res.error) {
                authService.setToken(res.token);
                navigate('/');
            } else {
                loginError = true;
            }
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
            <label for="exampleInputEmail1">Email address</label>
            <input bind:value={email} type="email" class="form-control" id="exampleInputEmail1" aria-describedby="emailHelp" placeholder="Enter email">
            {#if email.length === 0 && submitClicked}
                <span class="error text-danger">Email is required*</span> 
            {/if}
            {#if email.length !== 0 && email.length < 6 && submitClicked}
                <span class="error text-danger">Email is too short*</span> 
            {/if}
            {#if email.length > 64 && submitClicked}
                <span class="error text-danger">Email is too long*</span> 
            {/if}
            {#if email.length >= 6 && email.length <= 64 && !authService.emailRegex.test(email) && submitClicked}
                <span class="error text-danger">Email is not valid*</span> 
            {/if}
        </div>
        <div class="form-group">
            <label for="exampleInputPassword1">Password</label>
            <input bind:value={password} type="password" class="form-control" id="exampleInputPassword1" placeholder="Password">
            {#if password.length === 0 && submitClicked}
                <span class="error text-danger">Password is required*</span> 
            {/if}
            {#if password.length !== 0 && password.length < 6 && submitClicked}
                <span class="error text-danger">Password is too short*</span> 
            {/if}
            {#if password.length > 64 && submitClicked}
                <span class="error text-danger">Password is too long*</span> 
            {/if}
        </div>
        {#if loginError && isValidInputs()}
                <span class="error text-danger">Email or Password is wrong*</span> 
        {/if}
        <div class="action">
            <Link class="already" to="/register">
                Not Registered Yet?
            </Link>
            <button type="button" class="btn btn-primary" on:click="{onSubmit}">Login</button>
        </div>
    </form>
</div>