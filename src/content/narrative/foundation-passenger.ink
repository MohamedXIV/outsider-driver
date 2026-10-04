EXTERNAL GAME_HAS_FACT(fact_id)
EXTERNAL GAME_REVEAL_FACT(fact_id)
EXTERNAL GAME_ADJUST_CITY_ATTENTION(delta, reason)

=== start ===
~ temp knows_checkpoint = GAME_HAS_FACT("fact:docks-checkpoint-rumor")
{ knows_checkpoint:
    Passenger: You already know what the customs lights mean.
- else:
    Passenger: Customs lights sweep every cab after midnight.
    ~ GAME_REVEAL_FACT("fact:docks-checkpoint-rumor")
}

* [Act like this is routine.]
    Driver: Of course.
    -> consequence
* [Ask why.]
    Driver: Why the sweep?
    -> consequence

=== consequence ===
~ GAME_ADJUST_CITY_ATTENTION(1, "checkpoint-conversation")
Passenger: Keep moving.
-> END
