<template>
  <article class="movie-card">
    <figure class="movie-card__figure">
      <NuxtLink :to="movie.to" class="movie-card__poster-link">
        <img
          :alt="movie.title"
          class="movie-card__poster"
          :src="movie.cover"
        >
        <span class="movie-card__rating">
          <Icon name="i-ph-star-fill" class="h-3.5 w-3.5" />
          {{ movie.rating.toFixed(1) }}
        </span>
      </NuxtLink>

      <h3 class="movie-card__title" :title="movie.title">
        <NuxtLink :to="movie.to">{{ movie.title }}</NuxtLink>
      </h3>
      <p class="movie-card__genre">{{ genreLabel }}</p>
    </figure>
  </article>
</template>

<script setup lang="ts">
import type { MockMovie } from "../../application/composables/useMockMoviesData"

defineProps<{
  genreLabel: string
  movie: MockMovie
}>()
</script>

<style scoped>
.movie-card {
  min-width: 0;
}

.movie-card__figure {
  margin: 0;
}

.movie-card__poster-link {
  position: relative;
  display: block;
  overflow: hidden;
  border-radius: 3px;
  background: #e5e7eb;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.16);
}

.movie-card__poster {
  display: block;
  width: 100%;
  aspect-ratio: 2 / 3;
  object-fit: cover;
  transition: transform 0.22s ease;
}

.movie-card__poster-link:hover .movie-card__poster {
  transform: scale(1.04);
}

.movie-card__rating {
  position: absolute;
  right: 8px;
  top: 8px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.58);
  padding: 3px 6px;
  color: #ffc000;
  font-size: 12px;
  font-weight: 800;
}

.movie-card__title {
  margin: 10px 0 0;
  overflow: hidden;
  color: #111827;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.movie-card__title a {
  color: inherit;
  text-decoration: none;
}

.movie-card__title a:hover {
  color: #0a58ca;
}

.movie-card__genre {
  margin: 4px 0 0;
  overflow: hidden;
  color: #7c8798;
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
