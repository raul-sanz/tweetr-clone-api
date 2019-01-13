'use strict'

const User = use('App/Models/User')
const Hash = use('Hash')
const Tweet = use('App/Models/Tweet')

class UserController {
  async signup ({response, request, auth}){
    const userData = request.only(['name', 'username', 'email', 'password'])

    try {
      
      const user = await User.create(userData)
      
      //const token = await auth.generate(user)

      return response.json({
          status: 'success',
          data: user
      })
    } catch (error) {
        return response.status(400).json({
            status: 'error',
            message: 'There was a problem creating the user, please try again later.'
        })
    }
  }

  async login({request, response, auth}){
    
      const token = await auth.attempt(
        request.input('email'),
        request.input('password')
      )
      return response.status(200).json({
        status: 'success',
        data: token
      })
   
  }

  async me ({response, auth}){
    const user = await User.query()
      .where('id', auth.current.user.id)
      .with('tweets', builder =>{
        builder.with('user')
        builder.with('favorites')
        builder.with('replies')
      })
      .with('following')
      .with('followers')
      .with('favorites')
      .with('favorites.tweet', builder=>{
        builder.with('user')
        builder.with('favorites')
        builder.with('replies')
      })
      .firstOrFail()

    return response.json({
      status: 'success',
      data: user
    })
  }

  async updateProfile ({request, response, auth}){
    try {
      const user = await auth.getUser()

      user.name = request.input('name')
      user.username = request.input('username')
      user.email = request.input('email')
      user.location = request.input('location')
      user.bio = request.input('bio')
      user.website_url = request.input('website_url')

      await user.save()

      return response.json({
        status: 'success',
        message: 'Perfil Actualizado',
        data: user
      })
    } catch (error) {
      return response.status(400).json({
        user:user,
        status: 'error',
        message: 'Se ha producido un problema al actualizar el perfil. Inténtalo de nuevo más tarde'
      })
    }
  }

  async changePassword ({request, response, auth}){
    const user = await auth.getUser()

    const verifyPassword = await Hash.verify(
      request.input('password'),
      user.password
    )

    if (!verifyPassword) {
      return response.status(400).json({
        user: user,
        status: 'error',
        message: 'La contraseña actual no pudo ser verificada! Inténtalo de nuevo.'
      })
    }

    user.password = request.input('newPassword')
    await user.save()

    return response.json({
      status:'success',
      message:'Contraseña Actualizada'
    })
  }

  async showProfile({response, request, params}){
    try{
      const user = await User.query()
        .where('username', params.username)
        .with('tweets', builder => {
          builder.with('user')
          builder.with('favorites')
          builder.with('replies')
        })
        .with('following')
        .with('followers')
        .with('favorites')
        .with('favorites.tweet', builder => {
          builder.with('user')
          builder.with('favorites')
          builder.with('replies')
        })
        .firstOrFail()

      return response.json({
        status: 'success',
        data: user
      })
    } catch (error) {
        return response.status(404).json({
          status: 'error',
          message: 'User not found'
        })
    }  
  }

  async usersToFollow ({ params, auth, response }) {
    // get currently authenticated user
    const user = auth.current.user

    // get the IDs of users the currently authenticated user is already following
    const usersAlreadyFollowing = await user.following().ids()

    // fetch users the currently authenticated user is not already following
    const usersToFollow = await User.query()
      .whereNot('id', user.id)
      .whereNotIn('id', usersAlreadyFollowing)
      .pick(3)

    return response.json({
      status: 'success',
      data: usersToFollow
    })
  }

  async follow ({ request, response, auth }){
    const user = await auth.getUser()

    await user.following().attach(request.input('user_id'))

    return response.json({
      status: 'success',
      data: null
    })
  }
  

  async unFollow ({ params,request, response, auth }){
     
     const user = await auth.getUser()

     await user.following().detach(params.id)
 
     return response.json({
         status: 'success',
         data: null
     })
  }

  async timeline({ response, auth }){
    const user =await  User.find(auth.current.user.id)

     const followersIds = await user.following().ids()

     followersIds.push(user.id)
 
     const tweets = await Tweet.query()
         .whereIn('user_id', followersIds)
         .with('user')
         .with('favorites')
         .with('replies')
         .fetch()
 
     return response.json({
         status: 'success',
         data: tweets
     })
  }

}

module.exports = UserController
