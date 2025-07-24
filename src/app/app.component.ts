import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { SocketService } from './socket.service';
import { CommonModule } from '@angular/common';

interface UserData {
  name: string;
  color: string;
  badge: string;
  status: string;
  mirror: boolean;
  xPosition: string;
  messages: {
    id: number;
    type: string;
    quote: string | null;
    text: string;
  }[]
}
const defaultTrain = {
  'status': 'no-hype',
  'lvl': 0,
  'prevlvl': null,
  'progress': null,
  'remain': ''
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [CommonModule],
})
export class AppComponent implements OnDestroy {
  private messageSubscription: Subscription;
  chat: UserData[] = [];
  users: string[] = [];
  train: {
    'status': string,
    'lvl': number,
    'prevlvl': number | null,
    'progress': number | null,
    'remain': string
  } = defaultTrain;

  constructor(private socketService: SocketService) {
    this.messageSubscription = this.socketService
      .on('message')
      .subscribe((data) => {
        this.train.status = data.train.status;
        if (this.train.status != 'no-hype') {
          if (data.train.progress) this.train.progress = data.train.progress;
          if (data.train.remain) this.train.remain = data.train.remain;
          if (data.train.lvl) {
            this.train.lvl = data.train.lvl;
            this.train.prevlvl = data.train.lvl - 1;
          }
        }
        else {
          this.train = defaultTrain;
        }

        const idx = this.users.indexOf(data.user);
        if (idx > -1) {
          this.chat[idx].messages.push(data.message);
          if (data.color) this.chat[idx].color = data.color;
          this.chat[idx].badge = data.badges.length > 1 && data.badges[0].search('Abonné') > -1 ? data.badges[1] : data.badges[0];
          let overChating = this.chat[idx].messages.length - 5;
          for (var i = 0; i < overChating; i++) {
            document.querySelector('.user-message')?.remove();
            this.chat[idx].messages.shift();
          }
        }
        else {
          const badgesHtml = data.badges.join("");
          let status = 'nosub';
          if (badgesHtml.search('Fondateur') > -1 ||
              badgesHtml.search('Abonn') > -1 ||
              badgesHtml.search('VIP') > -1 ||
              badgesHtml.search('cheer') > -1) {
            status = 'subbed'
          }
          if (badgesHtml.search('Modérateur') > -1) {
            status = 'modo'
            if (data.user.search(/^stream|bot$/i) > -1) {
              status = 'bot'
            }
          }
          if (badgesHtml.search('Vérifié') > -1 && data.user.search(/^stream|bot$/i) > -1) {
              status = 'bot'
          }
          if (badgesHtml.search('Diffuseur') > -1) {
            status = 'creator'
          }
          this.users.push(data.user);
          this.chat.push({
            name: data.user,
            color: data.color? data.color : 'var(--accent-color)',
            badge: data.badges.length > 1 && data.badges[0].search('Abonné') > -1 ? data.badges[1] : data.badges[0],
            status: status,
            xPosition: `${Math.round(Math.random() * 1300)}px`,
            mirror: Math.random() > 0.5,
            messages: [data.message]
          });
          let overPopulation = this.users.length - 50;
          for (var i = 0; i < overPopulation; i++) {
            document.querySelector('.user-container')?.remove();
            this.chat.shift();
            this.users.shift();
          }
        }
      });
  }

  ngOnDestroy() {
    this.messageSubscription.unsubscribe();
  }
}