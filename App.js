/**
 * Sample AppSync SDK React Native App
 */

import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  Button,
} from 'react-native';

import AWSAppSyncClient from 'aws-appsync'
import AppSyncConfig from './aws-exports' 

import gql from 'graphql-tag';

import { listTodos } from './src/graphql/queries';

import { createTodo } from './src/graphql/mutations';
import {v4 as uuid} from 'uuid';

const client = new AWSAppSyncClient({
  url: AppSyncConfig.aws_appsync_graphqlEndpoint,
  region: AppSyncConfig.aws_appsync_region,
  auth: {
    type: AppSyncConfig.aws_appsync_authenticationType,
    apiKey: AppSyncConfig.aws_appsync_apiKey,
  }
})

const App = () => {
  const [todos, updateTodos] = useState([]);

  useEffect(()=>{
      (async ()=>{
        await client.hydrated();
        list();
      })()
  }, []);

  async function create() {
    const newTodo = await client.mutate({
      mutation: gql(createTodo),
      variables: {
        input: {
          name: 'Use AppSync',
          description: 'Realtime and Offline',
        }
      },
      optimisticResponse: () => ({
        createTodo: {
          __typename: 'Todo', // This type must match the return type of the query below (listTodos)
          id: uuid(),
          name: 'Use AppSync',
          description: 'Realtime and Offline',
        }
      }),
      update: (cache, { data: { createTodo } }) => {
        const query = gql(listTodos);
  
        // Read query from cache
        const data = cache.readQuery({ query });
  
        // Add newly created item to the cache copy
        data.listTodos.items = [
          ...data.listTodos.items.filter(item => item.id !== createTodo.id),
          createTodo
        ];
  
        //Overwrite the cache with the new results
        cache.writeQuery({ query, data });
      }
    })
    console.log("New Todo", newTodo);
    
    list();
  }

  async function list() {
    const result = await client.query({
      query: gql(listTodos),
      fetchPolicy: 'network-only',
    })
    const items = result.data.listTodos.items;
    console.log(`Items: `, items );
    updateTodos(items);
  }

  return (
    <>
      <SafeAreaView>
        <View style={styles.buttonContainer}>
          <Button title={"Create Todo"} onPress={create} />
          <View style={styles.buttonSeparator}/>
          <Button title={"List Todos"} onPress={list} />
        </View>
        <ScrollView contentContainerStyle={styles.scrollView}>
          {todos.map((todo, index)=>
            (<Text style={styles.text} key={index}>{todo.name}</Text>))
          }
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    marginTop: 4
  },
  buttonSeparator: {
    marginVertical: 8
  },
  scrollView: {
    paddingTop: 8,
    alignItems: 'center', 
    justifyContent: 'center'
  },
  text: {
    fontSize: 16,
    margin: 4
  }
});

export default App;