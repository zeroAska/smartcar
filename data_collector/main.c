#include<stdio.h>
#include<stdlib.h>
#include<string.h>
#include<errno.h>
#include<sys/types.h>
#include<sys/socket.h>
#include<netinet/in.h>

#include <linux/can.h>

#include "lib.h"

struct can_frame cf;

#define MAXLINE 4096

int main(int argc, char** argv)
{
    int    listenfd, connfd;
    struct sockaddr_in     servaddr;
    char    buff[4096];
    int 	port;
    int     n;
   int cnt=0; 
    if(argc == 1)
    {
    	printf("usage : %s port\n",argv[0]);
    	return 0;
    }
    port = atoi(argv[1]);
    

    if( (listenfd = socket(AF_INET, SOCK_STREAM, 0)) == -1 ){
    printf("create socket error: %s(errno: %d)\n",strerror(errno),errno);
    exit(0);
    }

    memset(&servaddr, 0, sizeof(servaddr));
    servaddr.sin_family = AF_INET;
    servaddr.sin_addr.s_addr = htonl(INADDR_ANY);
    servaddr.sin_port = htons(port);

    if( bind(listenfd, (struct sockaddr*)&servaddr, sizeof(servaddr)) == -1){
    printf("bind socket error: %s(errno: %d)\n",strerror(errno),errno);
    exit(0);
    }

    if( listen(listenfd, 10) == -1){
    printf("listen socket error: %s(errno: %d)\n",strerror(errno),errno);
    exit(0);
    }

    printf("======waiting for client's request======\n");    
    
    if( (connfd = accept(listenfd, (struct sockaddr*)NULL, NULL)) == -1){
        printf("accept socket error: %s(errno: %d)",strerror(errno),errno);
        exit(0);
    }
     printf("OK\n");
    while(1){

    n = recv(connfd, &cf, sizeof(cf), 0);
    if(n!= sizeof(cf))
    	printf("warning : incomplete frame received.\n");
    	
    sprint_long_canframe(buff, &cf, 0);
  	printf("Received:%s  cnt:%d\n",buff,cnt++);
    
    }
    close(connfd);

    close(listenfd);
}
