import { 
    Component,
    OnInit,
    OnChanges,
    Input,
    Output,
    EventEmitter,
    ViewChild,
    ViewChildren,
    ElementRef,
    QueryList,
    DoCheck,
    KeyValueDiffers,
    KeyValueDiffer,
    IterableDiffers,
    IterableDiffer
} from '@angular/core';

import { TimeUtil } from '../../util/time.util';
import { PREFERENCE_KEYS } from '../../constants';

import { UserService } from '../../service/user.service';

import { Game } from '../../model/game';
import { Note } from '../../model/note';
import { Tag } from '../../model/tag';
import { GameMetadata } from '../../model/game-metadata';

import { Option } from '../view/editable-metadata.view';

import { GameNoteService } from '../service/game-note.service';

import { ShrinkAnim } from '../../util/anim.util';

import { Util } from '../../util/util';
import { TextUtil } from '../../util/text.util';

import { TeamService } from '../service/team.service';
import { Team } from '../../model/team';

import { FormSwitchDirective } from '../../directive/form-switch.directive';

interface DBObject {
    _id: string;
    name: string;
}

class TeamOption {
    team: Team;
    selected: boolean;
}

@Component({
    moduleId: module.id,
    selector: '.id-game-note',
    templateUrl: '../template/view/game-note.view.html',
    animations: [ShrinkAnim.height]
})
export class GameNoteView implements OnInit, OnChanges, DoCheck {

    @Input() note: Note;
    @Input() game: Game;

    @Input() showLinks: boolean;

    @Output() create: EventEmitter<Note> = new EventEmitter();
    @Output() remove: EventEmitter<Note> = new EventEmitter();

    @ViewChild('description') descriptionElement: ElementRef;
    @ViewChild('noteinput') inputElement: ElementRef;

    // @ViewChild('noteTeamDirective', {read: FormSwitchDirective}) noteTeamDirective: FormSwitchDirective;
    @ViewChildren(FormSwitchDirective) teamShareDirectives: QueryList<FormSwitchDirective>;

    descriptionHtml: string;

    showEdit: boolean;
    editable: boolean;
    showText: boolean;

    showUserName: boolean = true;
    showTeamShare: boolean;
    modifiedName: string;

    superAdmin: boolean;

    isPosting: boolean;

    noteInput: string;
    noteContext: string;
    noteContextOptions: Option[] = [];

    notePublic: boolean;
    noteTeam: boolean;
    noteTeamPartial: boolean;

    showControls: boolean = true;
    showDeleteConfirm: boolean;

    simpleDate: string;

    teamSelection: TeamOption[] = [];

    gameDiffer: KeyValueDiffer<string, any>;
    tagDiffer: IterableDiffer<DBObject>;
    nameDiffer: KeyValueDiffer<string, any>;

    constructor(
        private userService: UserService,
        private noteService: GameNoteService,
        private teamService: TeamService,
        private keyValueDiffers: KeyValueDiffers,
        private iterableDiffers: IterableDiffers
    ) {
    }
    
    ngOnInit() {

        this.superAdmin = this.userService.isSuperAdmin();

        if (this.userService.getTeams().length || this.userService.getAdminTeams().length) {
            this.showTeamShare = true;
        }

        if (!this.note) {
            setTimeout(() => {
                this.setupNoteEdit();
            }, 100);
        } else {
            let user = this.userService.getLoggedInUser();

            if (this.note.addedUser._id == user._id) {
                this.showUserName = false;
            }

            if (this.note.modifiedUser && this.note.addedUser._id != this.note.modifiedUser._id) {
                this.modifiedName = '<em>(edited by ' + this.note.modifiedUser.firstName + ' ' + this.note.modifiedUser.lastName + ')</em>';
            }

            this.renderDescription();
            this.showText = true;

            if (this.superAdmin || this.note.addedUser._id == user._id) {
                this.editable = true;
            }

            this.note.teams.forEach(team => {
                if (Util.indexOfId(user.adminOfTeams, team) > -1) {
                    this.editable = true;
                }
            });

            this.simpleDate = TimeUtil.postTime(this.note.dateModified);
        }
    }

    ngDoCheck() {
        if (this.game) {
            // this checks the game object to see if the values have changed
            let gameChanges = this.gameDiffer.diff(this.game),
                tagChanges = this.tagDiffer.diff(<DBObject[]> this.game.tags),
                nameChanges;

            if (this.game.names.length) {
                nameChanges = this.nameDiffer.diff(this.game.names[0]);
            }

            if (gameChanges || tagChanges || nameChanges) {
                this.setupContextOptions();
            }
        }
    }

    ngOnChanges(changes: any): void {
        // console.log('note changes?', changes);
        if (changes.game) {
            if (this.game) {
                this.gameDiffer = this.keyValueDiffers.find(this.game).create();
                this.tagDiffer = this.iterableDiffers.find(this.game.tags).create();
                if (this.game.names.length) {
                    this.nameDiffer = this.keyValueDiffers.find(this.game.names[0]).create();
                }
            }
        }
    }

    setupDebounce: any;
    setupContextOptions(): void {
        clearTimeout(this.setupDebounce);
        this.setupDebounce = setTimeout(() => {
            this._setupContextOptions();
        }, 100)
    }

    private _setupContextOptions(): void {
        this.noteContextOptions = [];

        if (!this.game) {
            return;
        }

        if (this.game.names.length) {
            this.noteContextOptions.push({
                name: 'This game: ' + this.game.names[0].name,
                _id: 'game',
                icon: 'rocket',
                description: 'This note will only apply to this game.'
            });
        }
        if (this.game.playerCount) {
            this.noteContextOptions.push({
                name: this.game.playerCount.name + ' Players',
                _id: 'metadata_' + this.game.playerCount._id,
                icon: 'users',
                description: 'This note will apply to any game involving \'' + this.game.playerCount.name + '\' player count.'
            });
        }
        if (this.game.duration) {
            this.noteContextOptions.push({
                name: this.game.duration.name,
                _id: 'metadata_' + this.game.duration._id,
                icon: 'users',
                description: 'This note will apply to any game involving \'' + this.game.duration.name + '\' duration.'
            });
        }

        if (this.game.tags) {
            (<Tag[]> this.game.tags).forEach(tag => {
                this.noteContextOptions.push({
                    name: tag.name,
                    _id: 'tag_' + tag._id,
                    icon: 'hashtag',
                    description: 'This note will apply to any game tagged \'' + tag.name + '\'.'
                })
            });
        }
    }

    renderDescription(): void {
        if (this.note && this.note.description) {
            this.descriptionHtml = TextUtil.getMarkdownConverter().makeHtml(this.note.description);
        } else {
            this.descriptionHtml = '';
        }
    }

    setupNoteEdit(): void {
        if (this.note && !this.editable) {
            return;
        }
        this.showText = false;

        let delay = this.note ? 100 : 1;

        setTimeout(() => {
            this.showEdit = true;

            this.noteContext = '';

            if (this.note) {
                this.noteInput = this.note.description;
                if (!this.note.teams || !this.note.teams.length) {
                    this.noteTeam = false;
                }
                if (this.note.game) {
                    this.noteContext = 'game';
                } else if (this.note.metadata) {
                    this.noteContext = 'metadata_' + (<GameMetadata> this.note.metadata)._id;
                } else if (this.note.tag) {
                    this.noteContext = 'tag_' + (<Tag> this.note.tag)._id;
                }

                this.notePublic = this.note.public;
            } else {
                this.noteTeam = this.userService.getPreference(PREFERENCE_KEYS.shareNotesWithTeam, 'false') == 'true';
            }

            this.teamSelection = [];
            this.teamService.fetchTeams().then(user => {
                let teams = [].concat(user.adminOfTeams, user.memberOfTeams),
                    noteTeams = this.note ? this.note.teams : [];
                teams.forEach(team => {
                    this.teamSelection.push({
                        team: team,
                        selected: Util.indexOfId(noteTeams, team) > -1
                    });
                })
                this.toggleTeamSelection();
            });

        }, delay);

    }

    cancelEdit(): void {
        this.showEdit = false;
        this.showText = false;
        setTimeout(() => {
            this.showText = true;
        }, 200);
    }

    setNoteContext(context: Option): void {
        this.noteContext = context._id;
    }

    saveNote(): void {
        if (!this.noteContext) {
            this.noteContext = this.noteContextOptions[0]._id;
        }

        let note = this.note || new Note();

        note.description = this.noteInput;
        this.renderDescription();
        
        if (this.noteContext == 'game') {
            note.game = this.game._id;
        } else if (this.noteContext.indexOf('tag_') > -1) {
            note.tag = this.noteContext.replace('tag_', '');
        } else if (this.noteContext.indexOf('metadata_') > -1) {
            note.metadata = this.noteContext.replace('metadata_', '');
        }

        note.public = this.notePublic;

        // if (this.noteTeam) {
        //     note.teams = [].concat(this.userService.getTeams(), this.userService.getAdminTeams());
        // } else {
        //     note.teams = [];
        // }
        note.teams = [];
        if (this.teamSelection.length) {
            this.teamSelection.forEach(team => {
                if (team.selected) {
                    note.teams.push(team.team);
                }
            })
        }
        this.userService.setPreference(PREFERENCE_KEYS.shareNotesWithTeam, this.noteTeam);

        this.isPosting = true;

        if (this.note) {

            this.noteService.updateNote(note).then(note => {
                this.isPosting = false;
                this.cancelEdit();
            });

        } else {

            this.noteService.createNote(note).then(note => {
                this.isPosting = false;
                this.noteInput = '';
                this.create.emit(note);
            });

        }

    }

    deleteNote(): void {
        this.showControls = false;
        setTimeout(() => {
            this.showDeleteConfirm = true;
        }, 250);
    }

    cancelDelete(): void {
        this.showDeleteConfirm = false;
        setTimeout(() => {
            this.showControls = true;
        }, 250);
    }

    doDeleteNote(): void {
        this.noteService.deleteNote(this.note).then(() => {
            this.remove.emit(this.note);
        });
    }

    teamShareToggle(): void {
        setTimeout(() => {
            this.teamSelection.forEach(team => {
                team.selected = this.noteTeam;
            });
            this.noteTeamPartial = false;
            this.checkAllSwitches();
        });
    }

    toggleTeamSelection(index?: number): void {
        setTimeout(() => {
            let pass = true,
                partial = false;
            this.teamSelection.forEach(team => {
                if (!team.selected) {
                    pass = false;
                } else {
                    partial = true;
                }
            });
            this.noteTeam = pass;
            this.noteTeamPartial = partial && !pass;
            this.checkAllSwitches();
        })
    }

    checkAllSwitches(): void {
        this.teamShareDirectives.forEach(item => {
            item.check();
        });
    }

}