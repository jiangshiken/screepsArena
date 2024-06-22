# variables
* DPP=damage per price
* DPP_H=0.8
* DPP_R=1
* AT=attack time
* TT=total time
* FT=TT-AT=flee time
* OD=opponent damage
* HD=heal damage/amount
* RD=ranged damage
* HP=price spent on heal
* RP=price spent on ranged
* DDPT=deal damage per tick
# expressions

OD=1

HD=HP*DPP_H=0.8*HP

RD=RP*DPP_R=RP

RP+HP=1

## damage balance

damage=heal

OD*AT=TT*HD

## deal damage per tick

DDPT=AT*RD/TT=(TT*HD/OD)*RD/TT=HD/OD*RD

DDPT=0.8*HP*RP/OD=0.8/OD * (HP*(1-HP)))

^
DDPT=0.8/OD*0.25

when HP=RP=0.5
