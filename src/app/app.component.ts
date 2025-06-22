import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { SocketService } from './socket.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface UserData {
  name: string;
  color: string;
  badge: string | null;
  sub: boolean;
  mirror: boolean;
  xPosition: string;
  messages: {
    quote: string | null;
    text: string;
  }[]
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule],
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
          // TODO pop up in front
          let overChating = this.chat[idx].messages.length - 5;
          for (var i = 0; i < overChating; i++) {
            document.querySelector('.user-message')?.remove();
            this.chat[idx].messages.shift();
          }
        }
        else {
          this.users.push(data.user);
          this.chat.push({
            name: data.user,
            color: data.color,
            badge: data.badge,
            sub: data.badge && (
              data.badge.search('Fondateur') > -1 ||
              data.badge.search('Modérateur') > -1 ||
              data.badge.search('Vérifié') > -1 ||
              data.badge.search('Abonn') > -1 ||
              data.badge.search('cheer') > -1
              ),
            xPosition: `${Math.round(Math.random() * 84)}vw`,
            mirror: Math.random() > 0.5,
            messages: [data.message]
          });
          let overPopulation = this.users.length - 50;
          for (var i = 0; i < overPopulation; i++) {
            document.querySelector('.user-container')?.remove();
            this.users.shift();
          }
        }
      });
  }

  ngOnDestroy() {
    this.messageSubscription.unsubscribe();
  }
}