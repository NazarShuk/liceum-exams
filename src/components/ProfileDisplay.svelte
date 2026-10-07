<script lang="ts">
    import type {profiles} from "@db/schema"
    type Profile = typeof profiles.$inferSelect

    const {profile} : {profile: Profile} = $props()
</script>

<div class="flex flex-col h-24 border items-center justify-center">
    <p>{profile.title}</p>
    <p>{profile.description}</p>
</div>