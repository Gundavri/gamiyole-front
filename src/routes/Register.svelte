<script lang="typescript">
    import { Link } from "svelte-routing";
    import { AuthService } from '../services/auth.service';

    let submitClicked = false;
    let name, surname, email, password1, password2;

    const authService = AuthService.getInstance();

    async function onSubmit() {
        submitClicked = true;
        console.log(await authService.register('asdasd', 'asdasd', 'asdas', 'asdasd'));
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
            <label for="exampleInputEmail1">Name</label>
            <input bind:value={name} type="text" class="form-control" id="exampleInputEmail1" placeholder="Enter name">
            {#if user.loggedIn}
                <span class="error text-danger">Some Errors related to something</span> 
            {/if}
        </div>
        <div class="form-group">
            <label for="exampleInputEmail1">Surname</label>
            <input bind:value={surname} type="text" class="form-control" id="exampleInputEmail1" placeholder="Enter surname">
        </div>
        <div class="form-group">
            <label for="exampleInputEmail1">Email address</label>
            <input bind:value={email} type="email" class="form-control" id="exampleInputEmail1" aria-describedby="emailHelp" placeholder="Enter email">
        </div>
        <div class="form-group">
            <label for="exampleInputPassword1">Password</label>
            <input bind:value={password1} type="password" class="form-control" id="exampleInputPassword1" placeholder="Password">
        </div>
        <div class="form-group">
            <label for="exampleInputPassword1">Confirm Password</label>
            <input bind:value={password2} type="password" class="form-control" id="exampleInputPassword1" placeholder="Password">
        </div>
        <div class="action">
            <Link class="already" to="/login">
                Already Registered?
            </Link>
            <button type="button" class="btn btn-primary" on:click="{onSubmit}">Register</button>
        </div>
    </form>
</div>