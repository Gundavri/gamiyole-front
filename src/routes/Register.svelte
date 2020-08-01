<script>
    import { onMount } from 'svelte';
    import { Link, navigate } from "svelte-routing";
    import { AuthService } from '../services/auth.service';

    let submitClicked = false;
    let registerError = false;
    let showMessage = false;
    let name = '', surname = '', email = '', password1 = '', password2 = '';

    const authService = AuthService.getInstance();

    onMount(() => {
        authService.deleteToken();
    });


    function isValidInputs() {
        return (name.length >= 2 && name.length <= 32) &&
            (surname.length >= 2 && surname.length <= 32) &&
            (email.length >= 6 && email.length <= 64) &&
            authService.emailRegex.test(email) &&
            (password1.length >= 6 && password1.length <= 64) &&
            password1 === password2;
    }

    function onKeyup(event) {
        if(event.keyCode === 13){
            onSubmit();
        }
    }

    async function onSubmit() {
        submitClicked = true;
        if(isValidInputs()) {
            let res = await authService.register(name, surname, email, password1);
            if(res.error) {
                registerError = true;
            } else {
                showMessage = true;
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

        .text-danger {
            font-size: 13px;
            font-style: italic;
        }
    }
</style>

<div class="wrapper">
    {#if !showMessage}
        <form>
            <div class="form-group">
                <label for="exampleInputEmail1">Name</label>
                <input bind:value={name} type="text" class="form-control" 
                    id="exampleInputName" placeholder="Enter name" on:keyup="{onKeyup}">
                {#if name.length === 0 && submitClicked}
                    <span class="error text-danger">Name is required*</span> 
                {/if}
                {#if name.length !== 0 && name.length < 2 && submitClicked}
                    <span class="error text-danger">Name is too short*</span> 
                {/if}
                {#if name.length > 32 && submitClicked}
                    <span class="error text-danger">Name is too long*</span> 
                {/if}
            </div>
            <div class="form-group">
                <label for="exampleInputEmail1">Surname</label>
                <input bind:value={surname} type="text" class="form-control" 
                    id="exampleInputSurname" placeholder="Enter surname" on:keyup="{onKeyup}">
                {#if surname.length === 0 && submitClicked}
                    <span class="error text-danger">Surname is required*</span> 
                {/if}
                {#if surname.length !== 0 && surname.length < 2 && submitClicked}
                    <span class="error text-danger">Surname is too short*</span> 
                {/if}
                {#if surname.length > 32 && submitClicked}
                    <span class="error text-danger">Surname is too long*</span> 
                {/if}
            </div>
            <div class="form-group">
                <label for="exampleInputEmail1">Email address</label>
                <input bind:value={email} type="email" class="form-control" 
                    id="exampleInputEmail1" aria-describedby="emailHelp" placeholder="Enter email" on:keyup="{onKeyup}">
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
                <input bind:value={password1} type="password" class="form-control" 
                    id="exampleInputPassword1" placeholder="Password" on:keyup="{onKeyup}">
                {#if password1.length === 0 && submitClicked}
                    <span class="error text-danger">Password is required*</span> 
                {/if}
                {#if password1.length !== 0 && password1.length < 6 && submitClicked}
                    <span class="error text-danger">Password is too short*</span> 
                {/if}
                {#if password1.length > 64 && submitClicked}
                    <span class="error text-danger">Password is too long*</span> 
                {/if}
            </div>
            <div class="form-group">
                <label for="exampleInputPassword1">Confirm Password</label>
                <input bind:value={password2} type="password" class="form-control" 
                    id="exampleInputPassword2" placeholder="Password" on:keyup="{onKeyup}">
                {#if password2.length === 0 && submitClicked}
                    <span class="error text-danger">Please confirm password*</span> 
                {/if}
                {#if password2.length !== 0 && password1 !== password2 && submitClicked}
                    <span class="error text-danger">Passwords do not match*</span> 
                {/if}
            </div>
            {#if registerError && isValidInputs()}
                    <span class="error text-danger">Email already exists*</span> 
            {/if}
            <div class="action">
                <Link class="already" to="/login">
                    Already Registered?
                </Link>
                <button type="button" class="btn btn-primary" on:click="{onSubmit}">Register</button>
            </div>
        </form>
    {:else}
        <div class="message">Check your email!</div>
    {/if}

</div>