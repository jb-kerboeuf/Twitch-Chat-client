import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { SocketService } from './socket.service';
import { FormsModule } from '@angular/forms';

interface UserData {
  name: string;
  color: string;
  badge: string | null;
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
  imports: [FormsModule],
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
          let overChating = this.chat[idx].messages.length - 10;
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
            xPosition: `${Math.round(Math.random() * 84)}vw`,
            messages: [data.message]
          });
          let overPopulation = this.users.length - 100;
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