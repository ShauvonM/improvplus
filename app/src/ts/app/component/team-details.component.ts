import { Component, OnInit, Input } from '@angular/core';
import { Router, ActivatedRoute, Params } from '@angular/router';

import {AppComponent} from '../../component/app.component';
import { Tool } from '../view/toolbar.view';

import { User } from '../../model/user';
import { Team } from '../../model/team';
import { Address } from '../../model/address';
import { Purchase } from '../../model/purchase';
import { Invite } from '../../model/invite';

import { UserService } from '../../service/user.service';
import { TeamService } from '../../service/team.service';

import { TimeUtil } from '../../util/time.util';

import { DialogAnim, ToggleAnim } from '../../util/anim.util';

@Component({
    moduleId: module.id,
    selector: "team-details",
    templateUrl: "../template/team-details.component.html",
    animations: [DialogAnim.dialog]
})
export class TeamDetailsComponent implements OnInit {

    title: string;

    @Input() team: Team;
    user: User;

    tabs;
    selectedTab: string = 'team';

    private adminActions = [
        'team_subscription_invite',
        'team_invite',
        'team_edit',
        'team_user_promote',
        'team_purchases_view'
    ]

    address: string;
    remainingSubs: number;
    pendingInvites: number;

    selectedUser: User;

    isPosting: boolean;

    purchases: Purchase[];

    constructor(
        private _app: AppComponent,
        private router: Router,
        private route: ActivatedRoute,
        private userService: UserService,
        private teamService: TeamService
    ) { }

    private _tools: Tool[] = [
        {
            icon: "fa-sign-out",
            name: "leave",
            text: "Leave Team",
            active: false
        }
    ]

    _timeUtil = TimeUtil;

    ngOnInit(): void {
        this.user = this.userService.getLoggedInUser();

        this.route.params.forEach((params: Params) => {
            let id = params['id'];
            this.getTeam(id);
        });
    }

    onToolClicked(tool: Tool): void {
        switch (tool.name) {
            case "leave":
                this.leave();
                break;
        }
    }

    selectTab(tab): void {
        this.selectedTab = tab.id;
    }

    getDate(date: string): string {
        return TimeUtil.simpleDate(date);
    }

    getTime(date: string): string {
        return TimeUtil.simpleTime(date);
    }

    getTeam(id: string): void {
        this.teamService.getTeam(id)
            .then(team => this.setTeam(team));
    }

    can(action: string): boolean {
        let can = this.userService.can(action);

        if (this.adminActions.indexOf(action)) {
            return can && this.isUserAdmin();
        } else {
            return can;
        }
    }

    isUserAdmin(): boolean {
        return this.userService.isAdminOfTeam(this.team);
    }

    setTeam(team: Team): void {
        this.team = team;

        this.calculateSubs();

        if (this.isUserAdmin()) {
            this.teamService.fetchPurchases(this.team).then(p => {
                this.purchases = p;
            });
        }

        this.title = team.name;

        this.tabs = [
            {
                name: 'Team Details',
                id: 'team',
                icon: 'users'
            },
            {
                name: 'Members',
                id: 'members',
                icon: 'user-plus'
            }
        ];

        if (this.can('team_purchases_view')) {
            this.tabs.push({
                name: 'Team Subscription',
                id: 'subscription',
                icon: 'id-card-o'
            })
            this.tabs.push({
                name: 'Purchase History',
                id: 'purchases',
                icon: 'money'
            })
        }
    }

    calculateSubs(): void {
        this.pendingInvites = this.team.subscription.invites ? this.team.subscription.invites.length : 0;
        this.remainingSubs = this.team.subscription.subscriptions - this.team.subscription.children.length - this.pendingInvites;
    }

    saveEditName(name: string): void {
        this.team.name = name;
        this.teamService.saveTeam(this.team);
    }

    saveEditPhone(phone: string): void {
        this.team.phone = phone;
        this.teamService.saveTeam(this.team);
    }

    saveEditEmail(email: string): void {
        this.team.email = email;
        this.teamService.saveTeam(this.team);
    }

    saveEditUrl(url: string): void {
        this.team.url = url;
        this.teamService.saveTeam(this.team);
    }

    saveEditCompany(company: string): void {
        this.team.company = company;
        this.teamService.saveTeam(this.team);
    }

    saveEditAddress(address: Address): void {
        this.team.address = address.address;
        this.team.city = address.city;
        this.team.state = address.state;
        this.team.zip = address.zip;
        this.team.country = address.country;

        this.teamService.saveTeam(this.team);
    }

    newDescriptionText: string;
    editDescriptionShown: boolean;
    showEditDescription(): void {
        if (this.can('team_edit')) {
            this.newDescriptionText = this.team.description;
            this.editDescriptionShown = true;
        }
    }

    cancelDescription(): void {
        this.editDescriptionShown = false;
    }

    saveDescription(): void {
        this.team.description = this.newDescriptionText;
        this.teamService.saveTeam(this.team);
        this.cancelDescription();
    }

    selectUser(user: User): void {
        if (this.selectedUser !== user) {
            this.selectedUser = user;
        } else {
            this.selectedUser = null;
        }
    }

    showInviteDialog: boolean;
    inviteEmail: string;
    inviteStatus: string;
    inviteModel: Invite;

    selectedInvite: Invite;

    invite(): void {
        this._app.backdrop(true);

        this.showInviteDialog = true;
        this.inviteEmail = '';
    }

    cancelInviteDialog(): void {
        this._app.backdrop(false);
        
        this.showInviteDialog = false;
        this.inviteStatus = '';
    }

    submitInvite(): void {
        this.isPosting = true;

        this.teamService.invite(this.team, this.inviteEmail)
            .then(invite => {
                this.isPosting = false;
                this.inviteStatus = 'wait';
                this.inviteModel = invite;
                if (invite) {
                    this.team.subscription.invites.push(invite);
                    this.calculateSubs();

                    setTimeout(() => {
                        this.inviteStatus = 'sent';
                    }, 300);
                }
            })
    }

    selectInvite(invite: Invite): void {
        if (this.selectedInvite && this.selectedInvite._id == invite._id) {
            this.selectedInvite = null;
        } else {
            this.selectedInvite = invite;
        }
    }

    cancelInvite(invite: Invite): void {
        this.selectedInvite = invite;
        this._app.dialog('Cancel an Invitation', 'Are you sure you want to revoke your invitation to ' + invite.email + '? We already sent them the invite, but the link inside will no longer work. We will not notify them that it was cancelled.', 'Yes',
            () => {
                this.userService.cancelInvite(invite).then(done => {
                    if (done) {
                        let index = this.team.subscription.invites.indexOf(invite);
                        this.team.subscription.invites.splice(index, 1);

                        this.calculateSubs();
                    }
                })
            });
    }

    leave(): void {
        let body = `
            <p>Are you sure you want to leave this team? You will no longer have access to any of the team's resources.</p>
        `;

        if (this.user.subscription.parent == this.team.subscription._id) {
            body += `
                <p class="error"><strong>Warning: Your subscription is inherited from ${this.team.name}. If you leave the team, you will have to purchase a new subscription to keep using ImprovPlus.</strong></p>
            `
        }

        this._app.dialog('Leave ' + this.team.name + '?', body, 'Yes', () => {

            this.userService.leaveTeam(this.team).then(user => {

                this.router.navigate(['/app/dashboard']);

                setTimeout(() => {
                    this._app.dialog('It is done', 'You have successfully left ' + this.team.name + '.');
                }, 500);

            });

        });
    }

    buySubscription(): void {
        this._app.toast("This button doesn't work yet. Soon, though. Soon.");
    }

    getUserName(user: User): string {
        return user.firstName ? user.firstName : 'this user';
    }

    removeUserFromTeam(user: User): void {
        this._app.dialog('Remove ' + this.getUserName(user) + ' from the Team?',
            'Are you sure you want to remove them from the Team?', 'Yes', () => {
                this.teamService.removeUserFromTeam(this.team, user).then(team => {
                    this.setTeam(team);
                });
            });
    }

    promoteUser(user: User): void {
        this._app.dialog('Promote ' + this.getUserName(user) + ' to Team Admin?',
            'As a Team Admin, they will be able to view the Team\'s purchase history, add or remove users, and make purchases for the Team.', 'Yes',
            () => {
                this.teamService.promoteUser(this.team, user).then(team => {
                    this.setTeam(team);
                });
            });
    }

    demoteUser(user: User): void {
        this._app.dialog('Demote ' + this.getUserName(user) + '?',
            'This user will no longer have Team Admin privelages.', 'Yes',
            () => {
                this.teamService.demoteUser(this.team, user).then(team => {
                    this.setTeam(team);
                });
            });
    }

}
