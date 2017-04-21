import { 
    Component,
    OnInit,
    Input,
    Output,
    EventEmitter
} from '@angular/core';
import { Router, Routes, RouterModule } from '@angular/router';

import { UserService } from "../service/user.service";

import { User } from "../model/user";

import { DialogAnim, FadeAnim } from '../util/anim.util';

const MAX_ATTEMPTS = 5;

@Component({
    moduleId: module.id,
    selector: "login",
    templateUrl: "../template/view/login.view.html",
    animations: [
        DialogAnim.dialog,
        FadeAnim.fadeAbsolute
    ],
    styles: [`
        .password-recover-link {
            
        }
    `]
})
export class LoginView implements OnInit {

    email: string;
    password: string;

    loginError: string;

    errorCount: number;

    runaway: boolean;

    @Input() show: boolean;

    @Output() done: EventEmitter<User> = new EventEmitter();

    showRecoverPassword: boolean;
    recoverPasswordError: string;
    recoverPasswordDone: boolean;

    isPosting: boolean;

    weGood: boolean;

    constructor(
        private userService: UserService
    ) { }

    ngOnInit(): void {
        this.errorCount = 0;
        this.weGood = true;
    }

    submitLogin(): void {
        this.loginError = "";
        this.isPosting = true;
        this.userService.login(this.email, this.password)
            .then((user) => {
                this.email = "";
                this.password = "";

                //this.router.navigate(['/games']);
                this.done.emit(user);
                this.isPosting = false;
            })
            .catch((reason) => {
                this.isPosting = false;
                this.errorCount++;
                if (reason.status == 500) {
                    this.loginError = "Some sort of server error happened. Sorry.";
                } else {
                    if (this.errorCount === 1) {
                        this.loginError = "That is not the correct username or password.";
                    } else if (this.errorCount === 2) {
                        this.loginError = "That is still not the correct username or password.";
                    } else if (this.errorCount === 3) {
                        this.loginError = "Yo, dawg, try using your actual password.";
                    } else if (this.errorCount === 4) {
                        this.loginError = `<a href="/images/password-incorrect.png" target="_blank">Die wanna wanga!</a>`;
                    } else if (this.errorCount == MAX_ATTEMPTS) {
                        this.loginError = "I'll let you take one more crack at it.";
                    } else {
                        this.loginError = "That's it, I'm out of here.";

                        this.runaway = true;

                        setTimeout(() => {
                            this.weGood = false;
                            this.show = false;
                            this.done.emit(null);
                        }, 7100);
                    }
                }
            });
    }

    cancel(): boolean {
        this.showRecoverPassword = false;
        this.done.emit(null);
        return false;
    }

    recoverPassword(): void {
        this.show = false;
        setTimeout(() => {
            this.showRecoverPassword = true;
            this.show = true;
        }, 200)
    }

    cancelRecoverPassword(): void {
        this.show = false;
        setTimeout(() => {
            this.showRecoverPassword = false;
            this.show = true;
        }, 200)
    }

    submitRecoverPassword(): void {
        this.isPosting = true;
        this.recoverPasswordError = '';
        this.userService.recoverPassword(this.email)
        .catch(e => {
            console.log(e);
            this.recoverPasswordError = 'We had a problem looking up that address.';
        })
        .then((success) => {
            this.isPosting = false;

            console.log('success?', success);

            if (success) {
                this.show = false;
                setTimeout(() => {
                    this.showRecoverPassword = false;
                    this.recoverPasswordDone = true;
                    this.show = true;
                }, 200)
            } else {
                this.recoverPasswordError = 'We had a problem looking up that address.';
            }
        });
    }

}
