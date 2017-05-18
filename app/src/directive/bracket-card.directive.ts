import {
    Directive,
    ElementRef,
    OnInit,
    Input
} from '@angular/core';

@Directive({
    selector: '[bracketCard]'
})
export class BracketCardDirective implements OnInit {

    @Input() error: string;
    @Input() key: string;

    card: HTMLElement;
    isClosed: boolean;
    isOpen: boolean;

    contentDefault: HTMLElement;
    contentOpen: HTMLElement;

    constructor(el: ElementRef) {
        this.card = el.nativeElement;
    }

    ngOnInit(): void {
        this._saveDimens();

        this.contentOpen = <HTMLElement> this.card.querySelector('.body-open');
        this.contentDefault = <HTMLElement> this.card.querySelector('.body-default');

        if (!this.contentOpen) {
            this.isOpen = true;
        }
    }

    private _saveDimens(): void {
        this.card.dataset.width = this.card.offsetWidth.toString();
        this.card.dataset.height = this.card.offsetHeight.toString();
    }

    close(delay?: number): void {

        delay = delay || 10;

        this._saveDimens();

        setTimeout(() => {
            if (window.innerWidth < 500) {
                this._closeVertical();
            } else {
                this._closeHorizontal();
            }

            this.isOpen = false;
            this.isClosed = true;
            this.card.classList.remove('card-open')
            this.card.classList.add('card-closed')
        }, delay);
    }

    private _closeVertical(): void {

        let children = this.card.children;
        for (let i = 0; i < children.length; i++) {
            let child = <HTMLElement>children[i];
            setTimeout(() => {
                child.style.opacity = '0';
            }, 10)
        }

        this.card.style.height = this.card.offsetHeight + 'px';
        this.card.style.overflow = 'hidden';

        setTimeout(() => {
            this.card.style.height = '0px';
            this.card.style.opacity = '0.5';
        }, 10);
    }

    private _closeHorizontal(): void {

        let children = this.card.children;

        for(let i = 0; i < children.length; i++) {
            let child = <HTMLElement>children[i];
            child.style.width = child.offsetWidth + 'px';
            child.style.boxSizing = 'border-box';
            child.style.transform = 'translateX(-50%)';
            child.style.marginLeft = '50%';

            setTimeout(() => {
                child.style.opacity = '0';
            }, 10)
        }

        this.card.style.width = this.card.offsetWidth + 'px';
        this.card.style.overflow = 'hidden';

        setTimeout(() => {
            this.card.style.flexGrow = '0';
            this.card.style.width = '0px';
            this.card.style.opacity = '0.5';
        }, 10);
    }

    private _closeContent(): void {
        setTimeout(() => {
            this.card.style.maxWidth = '';
            let height = this.card.dataset.contentheight;

            this.contentDefault.style.height = height + 'px';

            this.contentOpen.style.opacity = '0';

            setTimeout(() => {
                this.contentDefault.style.opacity = '1';
            }, 300);
        }, 10);
    }

    open(delay?: number): void {
        delay = delay || 10;

        // if the width isn't already 0, it's already open
        if (!this.contentOpen && this.card.style.height !== '0px' && this.card.style.width !== '0px') {
            return;   
        }

        setTimeout(() => {
            if (this.contentOpen) {
                this._openContent();
            } else {
                this._openBasic();
            }

            this.isClosed = false;
            this.isOpen = true;
            this.card.classList.remove('card-closed');
            this.card.classList.add('card-open');
        }, delay);
    }

    private _openBasic() {
        let height = this.card.dataset.height,
            width = this.card.dataset.width;
            
        let children = this.card.children;
        for(let i = 0; i < children.length; i++) {
            let child = <HTMLElement> children[i];

            child.style.opacity = '0';

            if (!child.classList.contains('body-open')) {
                setTimeout(() => {
                    child.style.opacity = '1';
                }, 200)
            }
        }

        this.card.style.overflow = 'hidden';

        setTimeout(() => {
            this.card.style.height = height + 'px';
            this.card.style.width = width + 'px';
            this.card.style.opacity = '1';

            setTimeout(() => {
                this.card.style.flexGrow = '';
                this.card.style.width = '';
                this.card.style.height = '';
                this.card.style.overflow = '';
            }, 500)
        }, 10);
    }

    private _openContent() {

        setTimeout(() => {
            this.card.style.maxWidth = '100%';
            this.card.dataset.contentheight = this.contentDefault.offsetHeight.toString();
            this.contentDefault.style.height = this.contentDefault.offsetHeight + 'px';
            this.contentDefault.style.opacity = '0';

            this.contentOpen.removeAttribute('style');

            setTimeout(() => {
                this.contentDefault.style.height = this.contentOpen.offsetHeight + 'px';
                this.contentOpen.style.opacity = '1';
            }, 200);
        }, 10);

    }

    reset(delay?: number): void {
        delay = delay || 10;

        setTimeout(() => {
            if (this.isOpen && this.contentOpen) {
                this._closeContent();
            } else if (this.isClosed) {
                this._openBasic();
            }

            this.isClosed = false;
            this.isOpen = false;
            this.card.classList.remove('card-open');
            this.card.classList.remove('card-closed')
        }, delay);
    }
    
}