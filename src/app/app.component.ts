import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { SocketService } from './socket.service';
import { CommonModule } from '@angular/common';

interface UserData {
  name: string;
  color: string;
  badge: string | null;
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

  constructor(private socketService: SocketService) {
    this.messageSubscription = this.socketService
      .on('message')
      .subscribe((data) => {
        const idx = this.users.indexOf(data.user);
        if (idx > -1) {
          this.chat[idx].messages.push(data.message);
          this.chat[idx].color = data.color;
          // TODO pop up in front
          let overChating = this.chat[idx].messages.length - 5;
          for (var i = 0; i < overChating; i++) {
            document.querySelector('.user-message')?.remove();
            this.chat[idx].messages.shift();
          }
        }
        else {
          let status = 'nosub';
          if (data.badge && (
            data.badge.search('Fondateur') > -1 ||
            data.badge.search('Modérateur') > -1 ||
            data.badge.search('Vérifié') > -1 ||
            data.badge.search('Abonn') > -1 ||
            data.badge.search('VIP') > -1 ||
            data.badge.search('cheer') > -1
          )) {
            status = 'subbed'
            if (data.user == 'WizeBot' || data.user == 'WZBot' || data.user == 'Nightbot' || data.user == 'StreamElements' || data.user == 'Moobot' || data.user == 'Fossabot') {
              status = 'bot'
            }
          }
          if (data.badge && data.badge.search('Diffuseur') > -1) {
            status = 'creator'
          }
          this.users.push(data.user);
          this.chat.push({
            name: data.user,
            color: data.color,
            badge: data.badge,
            status: status,
            xPosition: `${Math.round(Math.random() * 80)}vw`,
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